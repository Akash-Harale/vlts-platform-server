// controllers/roleController.js
/*
Date: 21 March 2026
Author: Suresh Gupta

Enforcement Flow
authMiddleware ensures the user is authenticated.
superAdminOnly ensures only Super Admin (with manage_roles) can create/update/delete.
logger.audit() records every successful or failed action.
logger.error() records exceptions with stack trace.

Additonal features:
Get roles by scope → filter system vs tenant roles.
Search roles by name → partial match search.
Export roles → dump all roles as JSON (useful for backups).
Import roles → bulk insert/update from JSON payload (aligns with migration utility).

With these additions, role routes now cover the full lifecycle: CRUD, search, filter, import/export. 
This makes RBAC API complete and consistent with the rest of authentication services.


Benefits
Security: Only Super Admin can modify roles.
Transparency: Every action logged in audit_logs or error_logs.
Flexibility: Roles externalized in roles.json for easy updates.
Compliance: Traceability for all role changes.
*/

const Role = require('../models/roleModel');
const logger = require('../utils/logger');

// Get all roles
exports.getRoles = async (req, res) => {
  console.log('roleController: getRoles called.... ');

  try {
    const roles = await Role.find();
    if (!roles) {
        return res.status(404).json({ error: "Roles not found, Database empty!" });
    }
    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "read",
      "roles",
      "Fetched all roles",
      "success",
      req.user.tenant_id,
      req.trace_id
    );
    res.status(200).json(roles);
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "roles",
      req.user?.tenant_id || null,
      req.trace_id,
      500
    );
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

// Get role by ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      await logger.audit(
        req.user.employee_id,
        req.user.employee_id.name,   // NEW: pass employee name
        req.user.role,
        "read",
        "roles",
        `Role Id: ${req.params.id} not found`,
        "failed",
        req.user.tenant_id,
        req.trace_id
      );
      return res.status(404).json({ error: "Role Id: `${req.params.id} not found!" });
    }

    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "read",
      "roles",
      `Fetched role ${role}`,
      "success",
      req.user.tenant_id,
      req.trace_id
    );
    res.json(role);
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "roles",
      req.user?.tenant_id || null,
      req.trace_id,
      500
    );
    res.status(500).json({ error: "Failed to fetch role" });
  }
};

// Create role (Super Admin only)
exports.createRole = async (req, res) => {
  console.log('roleController: createRole called.... ');
  try {
    const role = await Role.create(req.body);
    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "create",
      "roles",
      `Created role ${role.name}`,
      "success",
      req.user.tenant_id,
      req.trace_id
    );
    res.status(201).json({ message: "Role created successfully", role });
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "roles",
      req.user?.tenant_id || null,
      req.trace_id,
      500
    );
    res.status(500).json({ error: "Failed to create role" });
  }
};

// Update role (Super Admin only)
exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!role) {
      await logger.audit(
        req.user.employee_id,
        req.user.employee_id.name,   // NEW: pass employee name
        req.user.role,
        "update",
        "roles",
        "Role not found",
        "failed",
        req.user.tenant_id,
        req.trace_id
      );
      return res.status(404).json({ error: "Role not found" });
    }
    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "update",
      "roles",
      `Updated role ${role.name}`,
      "success",
      req.user.tenant_id,
      req.trace_id
    );
    res.json({ message: "Role updated successfully", role });
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "roles",
      req.user?.tenant_id || null,
      req.trace_id,
      500
    );
    res.status(500).json({ error: "Failed to update role" });
  }
};

// Delete role (Super Admin only)
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      await logger.audit(
        req.user.employee_id,
        req.user.employee_id.name,   // NEW: pass employee name
        req.user.role,
        "delete",
        "roles",
        "Role not found",
        "failed",
        req.user.tenant_id,
        req.trace_id
      );
      return res.status(404).json({ error: "Role not found" });
    }
    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "delete",
      "roles",
      `Deleted role ${role.name}`,
      "success",
      req.user.tenant_id,
      req.trace_id
    );
    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    await logger.error(
      req.user?.employee_id?.emp_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role?.name || "unknown",
      err,
      "roles",
      req.user?.tenant_id || null,
      req.trace_id,
      500
    );
    res.status(500).json({ error: "Failed to delete role" });
  }
};

// Get roles by scope
exports.getRolesByScope = async (req, res) => {
  try {
    const roles = await Role.find({ scope: req.params.scope });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch roles by scope" });
  }
};

// Search roles by name
exports.searchRolesByName = async (req, res) => {
  try {

    const roleName = new RegExp(req.params.name, 'i');

    console.log('roleController: serachRoleByName: ', roleName);

    const roles = await Role.find({ name: roleName });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Failed to search roles" });
  }
};

// Export roles as downloadable JSON file
exports.exportRoles = async (req, res) => {
  console.log('roleController: exportRoles API called...');

  try {
    const roles = await Role.find();

    // Set headers to force download
    res.setHeader('Content-Disposition', 'attachment; filename=roles.json');
    res.setHeader('Content-Type', 'application/json');

    // Send JSON as file
    res.send(JSON.stringify(roles, null, 2));
  } catch (err) {
    console.error("Error exporting roles:", err);
    res.status(500).json({ error: "Failed to export roles" });
  }
};


// Import roles (bulk insert/update from JSON body)
exports.importRoles = async (req, res) => {
  try {
    const roles = req.body.roles;
    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: "Invalid roles format" });
    }

    for (const role of roles) {
      const existing = await Role.findOne({ name: role.name });
      if (existing) {
        existing.privileges = role.privileges;
        existing.scope = role.scope;
        existing.remarks = role.remarks;
        await existing.save();
      } else {
        await Role.create(role);
      }
    }

    res.json({ message: "Roles imported successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to import roles" });
  }
};
