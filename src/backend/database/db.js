const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure directory exists
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.DB_PATH);

// Enable foreign keys and performance pragmas
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

/**
 * Execute a query that returns multiple rows
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Execute a query that returns a single row
 */
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query.
 * Returns { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute a raw multi-statement SQL script (DDL)
 */
function exec(sql) {
  return db.exec(sql);
}

/**
 * Run a callback within an immediate transaction
 */
function transaction(callback) {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = callback();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

module.exports = {
  db,
  queryAll,
  queryOne,
  run,
  exec,
  transaction
};
