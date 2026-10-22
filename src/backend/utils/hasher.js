const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');

async function hashPassword(plainTextPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainTextPassword, salt);
}

async function verifyPassword(plainTextPassword, hashedPassword) {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}

function calculateFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function calculateBufferSha256(buffer) {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  return hashSum.digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  calculateFileSha256,
  calculateBufferSha256
};
