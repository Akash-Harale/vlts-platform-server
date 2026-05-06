// /routes/index.js
// All routes regstered here and version controlled as /api/v1.../v2... 
// 23/03/2026
const express = require('express');
const router = express.Router();

// Import all route modules
const roleRoutes = require('./roleRoutes');
const superAdminAuthRoutes = require('./superAdminAuthRoutes');
const platformTenantRoutes = require('./platformTenantRoutes');
const platformUserRoutes = require('./platformUserRoutes');
//const employeeRoutes = require('./employeeRoutes');

// const tenantRoutes = require('./tenantRoutes');
// const tenantClientRoutes = require('./tenantClientRoutes');

// const clientAuthRoutes = require('./clientAuthRoutes');
// const clientUserRoutes = require('./clientUserRoutes');

const auditRoutes = require('./auditRoutes');

// const fleetRoutes = require('./fleetRoutes');
// const tripRoutes = require('./tripRoutes');
// const vehicleAssignmentRoutes = require('./vehicleAssignmentRoutes');

// -------------------- Mount Routes under /api/v1 --------------------

// Platform (Super Admin)
router.use('/api/v1', roleRoutes);
router.use('/api/v1/auth/platform', superAdminAuthRoutes);
router.use('/api/v1/platform/tenants', platformTenantRoutes);
router.use('/api/v1/platform/users', platformUserRoutes);

// // Employees
// router.use('/api/v1/employees', employeeRoutes);

// // Tenant
// router.use('/api/v1/auth/tenant', tenantRoutes);
// router.use('/api/v1/tenant/clients', tenantClientRoutes);

// // Client
// router.use('/api/v1/auth/client', clientAuthRoutes);
// router.use('/api/v1/client/users', clientUserRoutes);

// // Audit
router.use('/api/v1/audit', auditRoutes);

// // Fleet
// router.use('/api/v1/fleet', fleetRoutes);
// router.use('/api/v1/fleet/trips', tripRoutes);
// router.use('/api/v1/fleet/vehicles', vehicleAssignmentRoutes);

// Health check
router.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;

