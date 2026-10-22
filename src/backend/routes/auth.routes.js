const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, run, transaction } = require('../database/db');
const { generateToken, requireAuth } = require('../middleware/auth');
const { logAuditEvent } = require('../middleware/audit');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      full_name,
      email,
      college,
      department,
      year_of_study,
      team_name,
      password,
      confirm_password
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !college || !department || !year_of_study || !password) {
      return res.status(400).json({ error: 'All fields are mandatory. Please complete all inputs.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    // Validate password confirmation
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existingUser = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({ error: 'An investigator account is already registered with this email address.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = transaction(() => {
      let teamId = null;

      // Handle team creation or joining
      if (team_name && team_name.trim()) {
        const cleanTeam = team_name.trim();
        let existingTeam = queryOne('SELECT id, max_size, status FROM teams WHERE name = ?', [cleanTeam]);
        
        if (!existingTeam) {
          const teamRes = run(`
            INSERT INTO teams (name, max_size, status)
            VALUES (?, 4, 'active')
          `, [cleanTeam]);
          teamId = Number(teamRes.lastInsertRowid);
        } else {
          if (existingTeam.status !== 'active') {
            throw new Error(`Team '${cleanTeam}' has been disabled by administration.`);
          }
          const memberCount = queryOne('SELECT COUNT(*) as c FROM team_members WHERE team_id = ?', [existingTeam.id]).c;
          if (memberCount >= existingTeam.max_size) {
            throw new Error(`Team '${cleanTeam}' is already at maximum capacity (${existingTeam.max_size} members).`);
          }
          teamId = existingTeam.id;
        }
      }

      // Insert User
      const userRes = run(`
        INSERT INTO users (full_name, email, password_hash, college, department, year_of_study, role, team_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'participant', ?, 'active')
      `, [full_name.trim(), cleanEmail, passwordHash, college.trim(), department.trim(), year_of_study.trim(), teamId]);

      const userId = Number(userRes.lastInsertRowid);

      // Add to team members if team was specified
      if (teamId) {
        const existingMembers = queryOne('SELECT COUNT(*) as c FROM team_members WHERE team_id = ?', [teamId]).c;
        const roleInTeam = existingMembers === 0 ? 'leader' : 'member';
        run(`
          INSERT INTO team_members (team_id, user_id, role_in_team)
          VALUES (?, ?, ?)
        `, [teamId, userId, roleInTeam]);

        if (roleInTeam === 'leader') {
          run('UPDATE teams SET leader_id = ? WHERE id = ?', [userId, teamId]);
        }
      }

      // Initialize Case Session
      run(`
        INSERT INTO case_sessions (user_id, team_id, case_id, status, rules_acknowledged)
        VALUES (?, ?, 'TLA-026', 'not_started', 0)
      `, [userId, teamId]);

      return { userId, teamId };
    });

    const newUser = queryOne(`
      SELECT u.id, u.full_name, u.email, u.college, u.department, u.year_of_study, u.role, u.team_id,
             t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ?
    `, [result.userId]);

    const token = generateToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // development compatible
      maxAge: 24 * 60 * 60 * 1000
    });

    logAuditEvent({
      actorId: newUser.id,
      actorName: newUser.full_name,
      actorRole: newUser.role,
      action: 'USER_REGISTRATION',
      targetObject: `USER:${newUser.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { email: newUser.email, team: newUser.team_name }
    });

    return res.status(201).json({
      message: 'Investigator credentials registered successfully.',
      token,
      user: newUser
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = queryOne(`
      SELECT u.id, u.full_name, u.email, u.password_hash, u.college, u.department, u.year_of_study,
             u.role, u.team_id, u.status, t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.email = ?
    `, [cleanEmail]);

    if (!user) {
      logAuditEvent({
        action: 'USER_LOGIN_FAILED',
        targetObject: `EMAIL:${cleanEmail}`,
        outcome: 'FAILURE',
        ipAddress: req.ip,
        details: { reason: 'User not found' }
      });
      return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    }

    if (user.status !== 'active') {
      logAuditEvent({
        actorId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'LOGIN_BLOCKED_SUSPENDED',
        targetObject: `USER:${user.id}`,
        outcome: 'FAILURE',
        ipAddress: req.ip
      });
      return res.status(403).json({ error: 'This account has been suspended by administration.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      logAuditEvent({
        actorId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'USER_LOGIN_FAILED',
        targetObject: `USER:${user.id}`,
        outcome: 'FAILURE',
        ipAddress: req.ip,
        details: { reason: 'Incorrect password' }
      });
      return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    logAuditEvent({
      actorId: user.id,
      actorName: user.full_name,
      actorRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      targetObject: `USER:${user.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    // Strip password hash from response
    delete user.password_hash;

    return res.json({
      message: 'Authentication successful.',
      token,
      user
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Session terminated successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = queryOne(`
    SELECT u.id, u.full_name, u.email, u.college, u.department, u.year_of_study,
           u.role, u.team_id, u.status, u.created_at, t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.id = ?
  `, [req.user.id]);

  const session = queryOne(`
    SELECT id, case_id, status, rules_acknowledged, started_at, deadline_at, extended_minutes
    FROM case_sessions
    WHERE user_id = ?
  `, [req.user.id]);

  res.json({
    user,
    session: session || null
  });
});

module.exports = router;
