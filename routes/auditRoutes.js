// /routes/auditRoutes.js

// Purpose: Audit log APIs for tenant and client admins
// 22 March 2026
/*
RBAC Context
Tenant Admin → "audit_logs" privilege → can view all audit logs for their tenant.
Client Admin → "audit_logs" privilege → can view audit logs scoped to their client profile.
Other roles do not have this privilege.

Benefits
RBAC enforced: only roles with "audit_logs" can access.
Tenant Admin sees full tenant logs.
Client Admin sees only their client’s logs.
Keeps audit trail transparent and scoped correctly.

Endpoint Map:-
Tenant Admin
    GET /api/audit/tenant → all audit logs for tenant scope.

Client Admin
    GET /api/audit/client → all audit logs for their client profile.
*/
const express = require('express');
const router = express.Router();
const { getTenantAuditLogs, getClientAuditLogs } = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');

// Tenant Admin audit logs
router.get('/tenant', authMiddleware(["audit_logs"]), getTenantAuditLogs);

// Client Admin audit logs
router.get('/client', authMiddleware(["audit_logs"]), getClientAuditLogs);

module.exports = router;
