// utils/logger.js

const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/auditLogModel');
const ErrorLog = require('../models/errorLogModel');

/**
 * Centralized logger for audit and error logs.
 * Ensures traceability, compliance, and consistency.
 * Uses employee_id.emp_id and employee_id.name for identity.
 */
module.exports = {
  /**
   * Write an audit log entry
   * @param {String} empId - Employee business identifier (emp_id)
   * @param {String} empName - Employee name
   * @param {String} role - Role name
   * @param {String} action - Action performed (create, update, delete, login, etc.)
   * @param {String} resource - Resource affected (user, tenant, client, role, etc.)
   * @param {String} reason - Description of the action
   * @param {String} status - success | failed
   * @param {String} tenantId - Tenant reference (optional)
   * @param {String} requestId - Request correlation ID (optional)
   */
  audit: async (
    empId,
    empName,
    role,
    action,
    resource,
    reason,
    status = "success",
    tenantId = null,
    requestId = null
  ) => {
    const logEntry = new AuditLog({
      trace_id: uuidv4(),
      request_id: requestId,
      emp_id: empId,
      emp_name: empName,
      role,
      tenant_id: tenantId,
      action,
      resource,
      reason,
      status,
      timestamp: new Date()
    });
    await logEntry.save();
    // For debugging; disable in production
    //console.log("AUDIT_LOG:", JSON.stringify(logEntry));
  },

  /**
   * Write an error log entry
   * @param {String} empId - Employee business identifier (emp_id)
   * @param {String} empName - Employee name
   * @param {String} role - Role name
   * @param {Error} error - Error object
   * @param {String} resource - Resource affected
   * @param {String} tenantId - Tenant reference (optional)
   * @param {String} requestId - Request correlation ID (optional)
   * @param {Number} statusCode - HTTP status code (default 500)
   */
  error: async (
    empId,
    empName,
    role,
    error,
    resource,
    tenantId = null,
    requestId = null,
    statusCode = 500
  ) => {
    const logEntry = new ErrorLog({
      trace_id: uuidv4(),
      request_id: requestId,
      emp_id: empId,
      emp_name: empName,
      role,
      tenant_id: tenantId,
      resource,
      error_message: error.message,
      stack: error.stack,
      status_code: statusCode,
      timestamp: new Date()
    });
    await logEntry.save();
    // For debugging; disable in production
    console.error("ERROR_LOG:", JSON.stringify(logEntry));
  }
};
