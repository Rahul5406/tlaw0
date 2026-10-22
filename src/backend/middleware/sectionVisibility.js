const { queryOne } = require('../database/db');

function isSectionEnabled(configKey) {
  try {
    const row = queryOne('SELECT value FROM event_config WHERE key = ?', [configKey]);
    if (!row) return true; // Default ON
    return row.value !== 'false' && row.value !== '0';
  } catch (err) {
    return true;
  }
}

function requireSectionEnabled(configKey) {
  return (req, res, next) => {
    try {
      const enabled = isSectionEnabled(configKey);
      const isAdmin = req.user && req.user.role === 'admin';

      if (!enabled && !isAdmin) {
        return res.status(403).json({
          error: 'This section is currently disabled by the administrator.',
          disabled: true,
          section_key: configKey
        });
      }
      next();
    } catch (err) {
      next();
    }
  };
}

module.exports = {
  isSectionEnabled,
  requireSectionEnabled
};
