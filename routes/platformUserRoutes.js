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
router.post('/', authMiddleware(["create_roles"]), createPlatformUser);
router.get('/', authMiddleware(["read_roles"]), getPlatformUsers);
router.get('/:id', authMiddleware(["read_roles"]), getPlatformUserById);
router.put('/:id', authMiddleware(["update_roles"]), updatePlatformUser);
router.delete('/:id', authMiddleware(["delete_roles"]), deletePlatformUser);

module.exports = router;

