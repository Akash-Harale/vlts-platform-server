// routes/roleRoutes.js
// Date: 21 March 2026
// Author: Suresh Gupta
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const superAdminOnly = require('../middleware/superAdminOnly');
const authMiddleware = require('../middleware/authMiddleware');

// Get all roles
router.get('/roles',
  authMiddleware(['read']),
  roleController.getRoles
);

//  Export roles (Super Admin only)
router.get('/roles/export',
  authMiddleware(['read_roles']),
  superAdminOnly,
  roleController.exportRoles
);

//  Import roles (Super Admin only)
router.post('/roles/import',
  authMiddleware(['create_roles']),
  superAdminOnly,
  roleController.importRoles
);

//  Get role by ID
router.get('/roles/:id',
  authMiddleware(['read']),
  roleController.getRoleById
);

//  Create role (Super Admin only)
router.post('/roles',
  authMiddleware(['create_roles']),
  superAdminOnly,
  roleController.createRole
);

//  Update role (Super Admin only)
router.put('/roles/:id',
  authMiddleware(['update_roles']),
  superAdminOnly,
  roleController.updateRole
);

//  Delete role (Super Admin only)
router.delete('/roles/:id',
  authMiddleware(['delete_roles']),
  superAdminOnly,
  roleController.deleteRole
);

//  Get roles by scope (system / tenant)
router.get('/roles/scope/:scope',
  authMiddleware(['read']),
  roleController.getRolesByScope
);

// 🔹 Search roles by name (partial match)
router.get('/roles/search/:name',
  authMiddleware(['read']),
  roleController.searchRolesByName
);



module.exports = router;
