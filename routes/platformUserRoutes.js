// Purpose: Super Admin manages platform (system) users
// 23 March 2026

const express = require('express');
const router = express.Router();
const {
  createPlatformUser,
  getPlatformUsers,
  updatePlatformUser,
  deletePlatformUser,getPlatformUserById
} = require('../controllers/platformUserController');

const authMiddleware = require('../middleware/authMiddleware');

// Super Admin only
router.post('/', authMiddleware(["manage_roles"]), createPlatformUser);
router.get('/', authMiddleware(["manage_roles"]), getPlatformUsers);
router.get('/:id', authMiddleware(["manage_roles"]), getPlatformUserById);
router.put('/:id', authMiddleware(["manage_roles"]), updatePlatformUser);
router.delete('/:id', authMiddleware(["manage_roles"]), deletePlatformUser);

module.exports = router;

