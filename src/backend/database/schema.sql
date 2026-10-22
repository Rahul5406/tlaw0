-- ============================================================================
-- THE LAST ARTIFACT (TLA-026) - DATABASE SCHEMA
-- Digital Forensics Investigation Platform
-- CyRA Community @ Sree Sakthi Engineering College
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  college TEXT NOT NULL,
  department TEXT NOT NULL,
  year_of_study TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  leader_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  max_size INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role_in_team TEXT NOT NULL DEFAULT 'member' CHECK (role_in_team IN ('leader', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tm_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members(user_id);

-- 4. CASE SESSIONS (Authoritative server timer and case lifecycle)
CREATE TABLE IF NOT EXISTS case_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  case_id TEXT NOT NULL DEFAULT 'TLA-026',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'expired')),
  rules_acknowledged INTEGER NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  deadline_at DATETIME NULL,
  extended_minutes INTEGER NOT NULL DEFAULT 0,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cs_user ON case_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_status ON case_sessions(status);

-- 5. EVENT CONFIGURATION (Website customizer & global settings)
CREATE TABLE IF NOT EXISTS event_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default participant navigation visibility controls (default ON)
INSERT OR IGNORE INTO event_config (key, value, description) VALUES
  ('nav_dashboard_visible', 'true', 'Participant navigation visibility: Dashboard'),
  ('nav_rules_visible', 'true', 'Participant navigation visibility: Event Rules'),
  ('nav_story_visible', 'true', 'Participant navigation visibility: Case Story'),
  ('nav_vault_visible', 'true', 'Participant navigation visibility: Evidence Vault'),
  ('nav_workspace_visible', 'true', 'Participant navigation visibility: Workspace'),
  ('nav_report_visible', 'true', 'Participant navigation visibility: Final Report'),
  ('nav_leaderboard_visible', 'true', 'Participant navigation visibility: Score Board');


-- 6. EVENT RULES & INSTRUCTIONS
CREATE TABLE IF NOT EXISTS event_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_er_order ON event_rules(sort_order);

-- 7. CASE STORY SECTIONS
CREATE TABLE IF NOT EXISTS case_story_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  badge TEXT DEFAULT 'CONFIDENTIAL',
  classification TEXT DEFAULT 'CONFIDENTIAL',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_css_order ON case_story_sections(sort_order);

-- 7b. CASE STORY ATTACHMENTS (Evidence files attached to case narrative sections)
CREATE TABLE IF NOT EXISTS case_story_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL REFERENCES case_story_sections(id) ON DELETE CASCADE,
  evidence_id INTEGER NULL REFERENCES evidence(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_csa_story ON case_story_attachments(story_id);

-- 8. SUSPECTS
CREATE TABLE IF NOT EXISTS suspects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suspect_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  relationships TEXT,
  statement TEXT NOT NULL,
  whereabouts TEXT NOT NULL,
  timeline_events TEXT,
  potential_motive TEXT NOT NULL,
  supporting_evidence TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. EVIDENCE
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('text', 'csv', 'pdf', 'image', 'video', 'archive', 'audio')),
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'CRITICAL' CHECK (classification IN ('CRITICAL', 'SECONDARY', 'BACKGROUND')),
  description TEXT NOT NULL,
  hints TEXT,
  score_value INTEGER NOT NULL DEFAULT 10,
  visibility_rule TEXT NOT NULL DEFAULT 'immediate' CHECK (visibility_rule IN ('immediate', 'time_delayed', 'hidden')),
  is_available INTEGER NOT NULL DEFAULT 1,
  case_id TEXT NOT NULL DEFAULT 'TLA-026',
  archived INTEGER NOT NULL DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ev_cat ON evidence(category);
CREATE INDEX IF NOT EXISTS idx_ev_code ON evidence(evidence_code);
CREATE INDEX IF NOT EXISTS idx_ev_avail ON evidence(is_available, archived);

-- 10. EVIDENCE VERSIONS & AUDIT HISTORY
CREATE TABLE IF NOT EXISTS evidence_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  previous_stored_filename TEXT NOT NULL,
  previous_sha256 TEXT NOT NULL,
  reason TEXT NOT NULL,
  replaced_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. INVESTIGATION NOTES (Participant workspace)
CREATE TABLE IF NOT EXISTS investigation_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  note_title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_in_user ON investigation_notes(user_id);

-- 12. INVESTIGATION TIMELINE (Investigator timeline reconstruction)
CREATE TABLE IF NOT EXISTS investigation_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  time_period TEXT NOT NULL DEFAULT 'PM' CHECK (time_period IN ('AM', 'PM')),
  description TEXT NOT NULL,
  associated_suspect TEXT,
  associated_evidence TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'High' CHECK (confidence_level IN ('High', 'Medium', 'Low', 'Speculative')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_it_user ON investigation_timeline(user_id);

-- 13. INVESTIGATION BOOKMARKS
CREATE TABLE IF NOT EXISTS investigation_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  personal_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, evidence_id)
);

-- 14. REPORT TEMPLATES
CREATE TABLE IF NOT EXISTS report_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL UNIQUE,
  section_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  min_words INTEGER NOT NULL DEFAULT 0,
  max_words INTEGER NOT NULL DEFAULT 2000,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  max_score INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rt_order ON report_templates(sort_order);

-- 15. REPORT DRAFTS
CREATE TABLE IF NOT EXISTS report_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  content_json TEXT NOT NULL,
  last_saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. FINAL REPORTS
CREATE TABLE IF NOT EXISTS final_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  case_id TEXT NOT NULL DEFAULT 'TLA-026',
  content_json TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'reviewed', 'returned_for_revision')),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fr_user ON final_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fr_status ON final_reports(status);

-- 17. REPORT EVALUATIONS
CREATE TABLE IF NOT EXISTS report_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL UNIQUE REFERENCES final_reports(id) ON DELETE CASCADE,
  evaluator_id INTEGER NOT NULL REFERENCES users(id),
  total_score REAL NOT NULL DEFAULT 0,
  rubric_scores_json TEXT NOT NULL,
  feedback TEXT,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. LEADERBOARD SCORES
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  team_or_user_name TEXT NOT NULL,
  total_score REAL NOT NULL DEFAULT 0,
  penalty REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  submitted_at DATETIME NULL,
  reports_submitted INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ls_rank ON leaderboard_scores(rank);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  actor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_object TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  ip_address TEXT,
  details_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_al_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_timestamp ON audit_logs(timestamp);
