  // /controllers/superAdminAuthController.js
  const User = require('../models/userModel');
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  const logger = require('../utils/logger');
  const { blacklistToken, verifyRefreshToken } = require('../utils/tokenService');

  function generateTokens(user) {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets are not defined in environment variables");
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role.name,
        employee_id: user.employee_id,   // from Employee record
        privileges: user.role.privileges
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Super Admin Login
   */
  exports.superAdminLogin = async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email })
        .populate('role')
        .populate('employee_id');

      console.log('superAdminLogin: user:', user);

      if (!user || !user.role.privileges.includes("manage_roles")) {
        return res.status(403).json({ error: "Forbidden: Super Admin only" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

      const { accessToken, refreshToken } = generateTokens(user);

      await logger.audit(
        user.employee_id,
        user.employee_id.name,   // NEW: pass employee name
        user.role.name,
        "login",
        "user",
        `Super Admin ${user.employee_id.name} login successful`,
        "success",
        null,
        req.trace_id
      );

      res.json({ accessToken, refreshToken });
    } catch (err) {
      await logger.error(
        null,
        null,
        "super_admin",
        err,
        "user",
        null,
        req.trace_id,
        500
      );
      next(err);
    }
  };

  /**
   * Super Admin Logout
   */
  exports.superAdminLogout = async (req, res, next) => {
    try {
      const { token } = req.body;
      await blacklistToken(token, req.user.id, "logout");

      await logger.audit(
        req.user.employee_id,
        req.user.employee_id.name,   // NEW: pass employee name
        req.user.role,
        "logout",
        "user",
        `Super Admin ${req.user.employee_id.name} logout successful`,
        "success",
        null,
        req.trace_id
      );

      res.json({ message: "Logged out successfully" });
    } catch (err) {
      await logger.error(
        req.user?.employee_id || "SYSTEM",
        req.user?.employee_id?.name || "SYSTEM", 
        req.user?.role || "unknown",
        err,
        "user",
        null,
        req.trace_id
      );
      next(err);
    }
  };

  /**
   * Super Admin Refresh Token
   */
  exports.superAdminRefresh = async (req, res, next) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "Refresh token required" });

    try {
      const decoded = await verifyRefreshToken(token);
      if (!decoded) return res.status(403).json({ error: "Invalid or blacklisted refresh token" });

      const user = await User.findById(decoded.id)
        .populate('role')
        .populate('employee_id');

      if (!user || !user.role.privileges.includes("manage_roles")) {
        await logger.audit(
          user?.employee_id,
          user.employee_id.name,   // NEW: pass employee name
          user?.role?.name,
          "refresh",
          "user",
          "Forbidden: Super Admin only",
          "failed",
          null,
          req.trace_id
        );
        return res.status(403).json({ error: "Forbidden: Super Admin only" });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      await logger.audit(
        user.employee_id,
        user.employee_id.name,   // NEW: pass employee name
        user.role.name,
        "refresh",
        "user",
        `Super Admin ${user.employee_id.name} token refreshed`,
        "success",
        null,
        req.trace_id
      );

      res.json({ accessToken, refreshToken });
    } catch (err) {
      await logger.error(
        null,
        null,
        "super_admin",
        err,
        "user",
        null,
        req.trace_id,
        403
      );
      res.status(403).json({ error: "Invalid or expired refresh token" });
    }
  };
