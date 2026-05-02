  // /models/auditLogModel.js

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  trace_id: { type: String, required: true },
  request_id: { type: String },
  emp_id: { type: String, required: true },       // Employee business identifier
  emp_name: { type: String },                     // Employee name for clarity
  role: { type: String, required: true },         // Role name
  tenant_id: { type: String },                    // Tenant reference if applicable
  action: { type: String, required: true },       // e.g., create, update, delete, login
  resource: { type: String, required: true },     // e.g., user, tenant, client
  reason: { type: String },                       // Description of action
  status: { type: String, enum: ["success", "failed"], default: "success" },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'audit_logs' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
