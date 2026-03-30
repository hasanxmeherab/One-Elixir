const Log = require('../models/Log');

/**
 * Write an admin activity log entry (fire-and-forget).
 * @param {Object} req  – Express request (reads req.admin and req.ip)
 * @param {string} action – e.g. 'CREATE_PRODUCT', 'UPDATE_ORDER'
 * @param {string} target – e.g. 'Perfume', 'Order', 'Admin'
 * @param {string} detail – human-readable description of what happened
 */
const writeLog = async (req, action, target, detail) => {
  try {
    await Log.create({
      adminId:   req.admin?.id   || null,
      adminName: req.admin?.name || 'System',
      action,
      target,
      detail,
      ip: req.ip || ''
    });
  } catch (e) {
    console.error('Log write failed:', e.message);
  }
};

module.exports = writeLog;
