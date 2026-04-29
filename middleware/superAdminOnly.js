
// middleware/superAdminOnly.js
/**
 * Middleware to ensure only Super Admin can access the route.
 * Uses privileges array to enforce manage_roles.
 */
async function superAdminOnly(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const privileges = req.user.privileges || [];

    console.log('User role: ', req.user.role, '\nPrivileges:', privileges);

    if (!privileges.includes("manage_roles")) {
      return res.status(403).json({ error: "Forbidden: Super Admin only" });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = superAdminOnly;
