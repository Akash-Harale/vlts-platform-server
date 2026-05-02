  // /models/errorLogModel.js

  const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  trace_id: { type: String, required: true },
  request_id: { type: String },
  emp_id: { type: String },                       // Employee business identifier
  emp_name: { type: String },                     // Employee name for clarity
  role: { type: String },                         // Role name
  tenant_id: { type: String },                    // Tenant reference if applicable
  resource: { type: String, required: true },     // Resource affected
  error_message: { type: String, required: true },
  stack: { type: String },
  status_code: { type: Number, default: 500 },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'error_logs' });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
