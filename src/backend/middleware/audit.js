const { run } = require('../database/db');

/**
 * Log an administrative or security audit event
 */
function logAuditEvent({ actorId = null, actorName = 'Anonymous', actorRole = 'unauthenticated', action, targetObject, outcome = 'SUCCESS', ipAddress = null, details = null }) {
  try {
    const detailsJson = typeof details === 'object' && details !== null ? JSON.stringify(details) : (details ? String(details) : null);
    run(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_object, outcome, ip_address, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [actorId, actorName, actorRole, action, targetObject, outcome, ipAddress, detailsJson]);
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err);
  }
}

/**
 * Express middleware helper to log action from request
 */
function auditAction(actionName, targetExtractor) {
  return (req, res, next) => {
    // Intercept finish to record outcome
    res.on('finish', () => {
      const outcome = res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';
      const actorId = req.user ? req.user.id : null;
      const actorName = req.user ? req.user.full_name : 'Anonymous';
      const actorRole = req.user ? req.user.role : 'unauthenticated';
      const targetObject = typeof targetExtractor === 'function' ? targetExtractor(req) : (targetExtractor || req.path);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      logAuditEvent({
        actorId,
        actorName,
        actorRole,
        action: actionName,
        targetObject,
        outcome,
        ipAddress: ip,
        details: { method: req.method, statusCode: res.statusCode, path: req.originalUrl }
      });
    });
    next();
  };
}

module.exports = {
  logAuditEvent,
  auditAction
};
