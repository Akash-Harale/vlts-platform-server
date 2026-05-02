    // routes/platformTenantRoutes.js
    // Purpose: Tenant provisioning and lifecycle management (Super Admin only)

const express = require('express');
const router = express.Router();
const {
  createTenant,
  getTenants,
  updateTenant,
  deleteTenant,getTenantById
} = require('../controllers/platformTenantController');

const authMiddleware = require('../middleware/authMiddleware');
const superAdminOnly = require('../middleware/superAdminOnly');

//  Create tenant (requires provision_tenant privilege)
router.post(
  '/',
  authMiddleware(["provision_tenant"]),
  superAdminOnly,
  createTenant
);

//  List tenants (requires read privilege)
router.get(
  '/',
  authMiddleware(["read"]),
  superAdminOnly,
  getTenants
);
//  Get tenant by ID (requires read privilege)
router.get(
  '/:id',
  authMiddleware(["read"]),
  superAdminOnly,
  getTenantById
);


//  Update tenant (requires update privilege)
router.put(
  '/:id',
  authMiddleware(["update"]),
  superAdminOnly,
  updateTenant
);

//  Delete tenant (requires delete privilege)
router.delete(
  '/:id',
  authMiddleware(["delete"]),
  superAdminOnly,
  deleteTenant
);

module.exports = router;
