/**
 * Server-authoritative time utilities for TLA-026 Forensics
 */

function getServerTime() {
  return new Date();
}

function getServerIsoString() {
  return new Date().toISOString();
}

/**
 * Validates and normalizes date (YYYY-MM-DD) and time (HH:MM with AM/PM).
 * Strictly preserves investigator-specified AM/PM without unintended conversion.
 */
function normalizeTimeRecord(dateStr, timeStr, period) {
  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validDate = dateRegex.test(dateStr) ? dateStr : '2026-09-24';

  // Validate time format HH:MM
  let hours = 12;
  let minutes = 0;
  if (timeStr && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || hours < 0 || hours > 23) hours = 12;
    if (isNaN(minutes) || minutes < 0 || minutes > 59) minutes = 0;
  }

  // Ensure period is strictly AM or PM
  let normalizedPeriod = 'AM';
  if (period) {
    const upperPeriod = String(period).trim().toUpperCase();
    if (upperPeriod === 'PM') normalizedPeriod = 'PM';
    else if (upperPeriod === 'AM') normalizedPeriod = 'AM';
  } else {
    // If not specified, derive from 24-hour hours without silent bug
    if (hours >= 12) {
      normalizedPeriod = 'PM';
      if (hours > 12) hours -= 12;
    } else if (hours === 0) {
      hours = 12;
      normalizedPeriod = 'AM';
    }
  }

  // Format hours and minutes as 2-digit
  const formattedHours = String(hours > 12 ? hours - 12 : hours === 0 ? 12 : hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedTime = `${formattedHours}:${formattedMinutes}`;

  return {
    event_date: validDate,
    event_time: formattedTime,
    time_period: normalizedPeriod,
    display_string: `${validDate} ${formattedTime} ${normalizedPeriod}`
  };
}

/**
 * Calculates remaining seconds from server deadline.
 */
function calculateRemainingSeconds(deadlineAtIso, gracePeriodMinutes = 0) {
  if (!deadlineAtIso) return null;
  const now = Date.now();
  const deadline = new Date(deadlineAtIso).getTime();
  const graceMs = (gracePeriodMinutes || 0) * 60 * 1000;
  const diffMs = (deadline + graceMs) - now;
  return Math.max(0, Math.floor(diffMs / 1000));
}

module.exports = {
  getServerTime,
  getServerIsoString,
  normalizeTimeRecord,
  calculateRemainingSeconds
};
