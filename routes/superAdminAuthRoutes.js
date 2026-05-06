// 21 March 2026
// routes/superAdminAuth    Routes.js
// Purpose: Super Admin authentication  --- Login, refresh, logout

const express = require('express');
const router = express.Router();
const {
  superAdminLogin,
  superAdminLogout,
  superAdminRefresh
} = require('../controllers/superAdminAuthController');

const authMiddleware = require('../middleware/authMiddleware');

// Authentication
/**
 * POST /api/auth/platform/login
 * Super Admin login
 */
router.post('/login', superAdminLogin);

/**
 * POST /api/auth/superadmin/logout
 * Super Admin logout
 */
router.post('/logout', authMiddleware(['read']), superAdminLogout);

/**
 * POST /api/auth/platform/refresh
 * Refresh token for Super Admin
 */
router.post('/refresh', superAdminRefresh);

module.exports = router;
