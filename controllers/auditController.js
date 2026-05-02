// /controllers/auditController.js
// Purpose: Audit log APIs for tenant and client admins
// 22 March 2026

const AuditLog = require('../models/auditLogModel'); // assume you have an auditLog schema
const logger = require('../utils/logger');

/**
 * Get all audit logs for a tenant
 */
exports.getTenantAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ tenant_id: req.user.tenant_id }).sort({ created_at: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all audit logs for a client profile
 */
exports.getClientAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({
      tenant_id: req.user.tenant_id,
      client_profile_id: req.user.client_profile_id
    }).sort({ created_at: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
