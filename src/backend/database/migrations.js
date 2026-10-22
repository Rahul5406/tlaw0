const fs = require('fs');
const path = require('path');
const { exec } = require('./db');

function runMigrations() {
  console.log('[DB] Running database migrations...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  exec(schemaSql);
  console.log('[DB] Migrations applied successfully.');
}

if (require.main === module) {
  runMigrations();
}

module.exports = {
  runMigrations
};
