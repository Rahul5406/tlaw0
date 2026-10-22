const jwt = require('jsonwebtoken');
const config = require('../config');
const { queryOne } = require('../database/db');

function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = queryOne('SELECT id, full_name, email, role, team_id, status FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been suspended by administration.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
    }
    next();
  });
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = queryOne('SELECT id, full_name, email, role, team_id, status FROM users WHERE id = ?', [decoded.id]);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name
    },
    config.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  generateToken
};
