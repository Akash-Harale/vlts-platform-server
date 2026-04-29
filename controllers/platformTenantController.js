require('dotenv').config();
const mongoose = require('mongoose');

const Tenant = require('../models/tenantModel');
const User = require('../models/userModel');
const Employee = require('../models/employeeModel');
const ClientProfile = require('../models/clientProfileModel');
const Role = require('../models/roleModel');
const logger = require('../utils/logger');

/**
 * CREATE TENANT + ADMIN
 */
exports.createTenant = async (req, res) => {
  const requestId = req.headers['x-request-id'] || null;
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const {
      tenant_name,
      tenant_short_name,
      tenant_cin,
      tenant_gstn,
      domain,
      address1,
      address2,
      city,
      district,
      state,
      pincode,

      // ADMIN DATA
      admin_mobile_number,
      admin_name,
      admin_email,
      admin_desig,
      admin_password
    } = req.body;
console.log("create tenant body: ", req.body);
    // ✅ VALIDATION
    if (!tenant_name || !tenant_short_name || !admin_name || !admin_email || !admin_password) {
      throw new Error("Required fields missing");
    }

    // ✅ DUPLICATE CHECK
    const existingTenant = await Tenant.findOne({
      tenant_short_name: tenant_short_name.toUpperCase().trim()
    }).session(session);

    if (existingTenant) throw new Error("Tenant short name already exists");

    // ✅ CREATE TENANT (ONLY TENANT DATA)
    const tenant = await Tenant.create([{
      tenant_name,
      tenant_short_name: tenant_short_name.toUpperCase().trim(),
      tenant_cin,
      tenant_gstn,
      domain,
      address1,
      address2,
      city,
      district,
      state,
      pincode,
      auth_methods: ["local"],
      status: "active"
    }], { session });

    // ✅ ROLE FETCH
    const role = await Role.findOne({ name: "tenant_admin" }).session(session);
    if (!role) throw new Error("Tenant admin role not found");

    // ✅ CREATE EMPLOYEE (ADMIN)
    const employee = await Employee.create([{
      name: admin_name,
      email: admin_email,
      mobile_number: admin_mobile_number,
      designation: admin_desig,
      scope: "tenant",
      tenant_id: tenant[0]._id
    }], { session });

    // ✅ CREATE USER
    const user = await User.create([{
      email: admin_email,
      password: admin_password,
      role: role._id,
      scope: "tenant",
      tenant_id: tenant[0]._id,
      employee_id: employee[0]._id
    }], { session });

    await session.commitTransaction();

    await logger.audit(
      req.user.employee_id,
      req.user.name,
      req.user.role,
      "create",
      "tenant",
      `Tenant ${tenant[0].tenant_name} created`,
      "success",
      tenant[0]._id,
      requestId
    );

    return res.status(201).json({
      tenant: tenant[0],
      tenantAdmin: user[0]
    });

  } catch (err) {
    console.log("error:", err);
    await session.abortTransaction();
    return res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};


/**
 * GET ALL TENANTS
 */
exports.getTenants = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || null;

  try {
    const tenants = await Tenant.find();

    await logger.audit(
      req.user.employee_id,
      req.user.role,
      "read",
      "tenant",
      "Fetched tenant list",
      "success",
      null,
      requestId
    );

    res.json(tenants);
  } catch (err) {
    next(err);
  }
};


/**
 * GET TENANT BY ID
 */
exports.getTenantById = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || null;

  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await logger.audit(
      req.user.employee_id,
      req.user.name,
      req.user.role,
      "read",
      "tenant",
      `Fetched tenant ${tenant.tenant_name}`,
      "success",
      tenant._id,
      requestId
    );

    res.json(tenant);
  } catch (err) {
    next(err);
  }
};


/**
 * UPDATE TENANT
 */
exports.updateTenant = async (req, res) => {
  const requestId = req.headers['x-request-id'] || null;
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const tenantId = req.params.id;

    // ❌ BLOCK NAME CHANGE
    if (req.body.tenant_name || req.body.tenant_short_name) {
      throw new Error("tenant_name and tenant_short_name cannot be updated");
    }

    // ✅ ONLY TENANT FIELDS
    const allowedFields = [
      "tenant_cin", "tenant_gstn", "domain",
      "address1", "address2",
      "city", "district", "state", "pincode",
      "status"
    ];

    const updateFields = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateFields },
      { new: true, runValidators: true, session }
    );

    if (!tenant) throw new Error("Tenant not found");

    // ✅ ADMIN UPDATE (SEPARATE)
    if (req.body.admin_email || req.body.admin_mobile_number) {

      if (req.body.admin_email) {
        await Employee.updateMany(
          { tenant_id: tenantId },
          { $set: { email: req.body.admin_email } },
          { session }
        );

        await User.updateMany(
          { tenant_id: tenantId },
          { $set: { email: req.body.admin_email } },
          { session }
        );
      }

      if (req.body.admin_mobile_number) {
        await Employee.updateMany(
          { tenant_id: tenantId },
          { $set: { mobile_number: req.body.admin_mobile_number } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    await logger.audit(
      req.user.employee_id,
      req.user.name,
      req.user.role,
      "update",
      "tenant",
      `Tenant ${tenant.tenant_name} updated`,
      "success",
      tenant._id,
      requestId
    );

    return res.json({
      message: "Tenant updated successfully",
      tenant
    });

  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};



/**
 * DELETE TENANT
 */
exports.deleteTenant = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || null;

  try {
    const tenantId = req.params.id;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const usersCount = await User.countDocuments({ tenant_id: tenantId });
    if (usersCount > 0) {
      return res.status(400).json({
        error: "Tenant has associated users. Delete users first."
      });
    }

    const clientsCount = await ClientProfile.countDocuments({ tenant_id: tenantId });
    if (clientsCount > 0) {
      return res.status(400).json({
        error: "Tenant has associated clients. Delete clients first."
      });
    }

    await Tenant.findByIdAndDelete(tenantId);

    await logger.audit(
      req.user.employee_id,
      req.user.name,
      req.user.role,
      "delete",
      "tenant",
      `Tenant ${tenant.tenant_name} deleted`,
      "success",
      tenantId,
      requestId
    );

    res.json({ message: "Tenant deleted successfully" });

  } catch (err) {
    next(err);
  }
};






// // Platform Tenant Controller
// // 21/03/2026
// // Purpose: Super Admin provisions tenants and auto‑creates Tenant Admin users.
// // Uses Employee module with composite emp_id generation.
// // Includes audit logging and structured error handling.

// require('dotenv').config(); // Ensure this is at the top
// const mongoose = require('mongoose');

// const Tenant = require('../models/tenantModel');
// const User = require('../models/userModel');
// const Employee = require('../models/employeeModel');
// const ClientProfile = require('../models/clientProfileModel');
// const Role = require('../models/roleModel');
// const logger = require('../utils/logger');
// //const { generateEmpId } = require('../utils/empIdGenerator');

// /**
//  * Create a new tenant and auto-provision Tenant Admin
//  * Body: { tenant_id, name, domain, admin_name, admin_email, admin_password }
//  *

// Key Transaction Processing Logic:
// Start a session: const session = await Tenant.startSession();
// Wrap operations in session.startTransaction() and session.commitTransaction().
// withTransaction(): Handles commit/abort automatically, no manual juggling.
// Used array form of Model.create with { session } to ensure transaction participation.
// Attached .session(session) to queries like Role.findOne.
// This way, if any insert fails (e.g., Employee creation or User creation), 
// the transaction will roll back all previous inserts, leaving the database consistent.

// Exponential backoff: const delay = 100 * Math.pow(2, attempt - 1); → waits 100ms, 200ms, 400ms before retrying.
// Retry loop: Up to MAX_RETRIES attempts (default 3).
// Error label check: Retries only if MongoDB marks the error as transient
//  (TransientTransactionError or UnknownTransactionCommitResult).

// Clean session handling: Always abortTransaction() + endSession() before retry or exit.

// */

// exports.createTenant = async (req, res, next) => {
//   const requestId = req.headers['x-request-id'] || null;

//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       // Tenant fields
//       tenant_name,
//       tenant_short_name,
//       tenant_cin,
//       tenant_gstn,
//       domain,
//       address1,
//       address2,
//       city,
//       district,
//       state,
//       pincode,
//       admin_mobile_number,
//       admin_whatsapp_number,
//       admin_name,
//       admin_email,
//       admin_desig,
//       admin_password
//     } = req.body;
//     console.log('createTenant: req.body', req.body);

//     // ✅ VALIDATION
//     if (!tenant_name || !tenant_short_name || !admin_name || !admin_email || !admin_password) {
//       throw new Error("Required fields missing");
//     }

//     // ✅ DUPLICATE CHECK
//     const existingTenant = await Tenant.findOne({
//       tenant_short_name: tenant_short_name.toUpperCase().trim()
//     }).session(session);

//     if (existingTenant) {
//       throw new Error("Tenant short name already exists");
//     }

//     // ✅ CREATE TENANT
//     const tenant = await Tenant.create([{
//       tenant_name,
//       tenant_short_name: tenant_short_name.toUpperCase().trim(),
//       tenant_cin,
//       tenant_gstn,
//       domain,
//       address1,
//       address2,
//       city,
//       district,
//       state,
//       pincode,
//       admin_mobile_number: admin_mobile_number,
//       admin_whatsapp_number: admin_whatsapp_number,
//       admin_email: admin_email,
//       auth_methods: ["local"],
//       status: "active"
//     }], { session });

//     // ✅ GET ROLE
//     const role = await Role.findOne({ name: "tenant_admin" }).session(session);
//     if (!role) throw new Error("Tenant admin role not found");

//     // ✅ CREATE EMPLOYEE
//     const employee = await Employee.create([{
//       name: admin_name,
//       email: admin_email,
//       mobile_number: admin_mobile_number,
//       designation: admin_desig,
//       scope: "tenant",
//       tenant_id: tenant[0]._id
//     }], { session });

//     // ✅ CREATE USER
//     const user = await User.create([{
//       email: admin_email,
//       password: admin_password,
//       role: role._id,
//       scope: "tenant",
//       tenant_id: tenant[0]._id,
//       employee_id: employee[0]._id
//     }], { session });

//     await session.commitTransaction();
//     session.endSession();

//     await logger.audit(
//       req.user.employee_id,
//       req.user.name,
//       req.user.role,
//       "create",
//       "tenant",
//       `Tenant ${tenant[0].tenant_name} created`,
//       "success",
//       tenant[0]._id,
//       requestId
//     );

//     return res.status(201).json({
//       tenant: tenant[0],
//       tenantAdmin: user[0]
//     });

//   } catch (err) {
//     console.error('createTenant error: ', err);
//     await session.abortTransaction();
//     session.endSession();

//     return res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * List all tenants (Super Admin only)
//  */
// exports.getTenants = async (req, res, next) => {
//   const requestId = req.headers['x-request-id'] || null;

//   console.log('getTenants: req.user:', req.user);

//   try {
//     const tenants = await Tenant.find();

//     await logger.audit(
//       req.user.employee_id,
//       req.user.role,
//       "read",
//       "tenant",
//       "Fetched tenant list",
//       "success",
//       null,
//       requestId
//     );

//     res.json(tenants);
//   } catch (err) {
//     await logger.error(
//       req.user?.employee_id || "SYSTEM",
//       req.user?.employee_id?.name || "SYSTEM",
//       req.user?.role || "unknown",
//       err,
//       "tenantListing",
//       null,
//       requestId,
//       500
//     );
//     next(err);
//   }
// };

// /**
//  * Get tenant by ID (Super Admin only)
//  * GET /api/platform/tenants/:id
//  */
// exports.getTenantById = async (req, res, next) => {
//   const requestId = req.headers['x-request-id'] || null;

//   try {
//     const tenant = await Tenant.findById(req.params.id);
//     if (!tenant) return res.status(404).json({ error: "Tenant not found" });

//     await logger.audit(
//       req.user.employee_id,
//       req.user.employee_id.name,   // NEW: pass employee name
//       req.user.role,
//       "read",
//       "tenant",
//       `Fetched tenant ${tenant.name}`,
//       "success",
//       tenant._id.toString(),
//       requestId
//     );

//     res.json(tenant);
//   } catch (err) {
//     await logger.error(
//       req.user?.employee_id || "SYSTEM",
//       req.user?.employee_id?.name || "SYSTEM",
//       req.user?.role || "unknown",
//       err,
//       "tenantListing",
//       null,
//       requestId,
//       500
//     );
//     next(err);
//   }
// };

// /**
//  * Update a tenant (Super Admin only)
//  * PUT /api/platform/tenants/:id
//  */

// exports.updateTenant = async (req, res, next) => {
//   const requestId = req.headers['x-request-id'] || null;
//   const session = await mongoose.startSession();

//   try {
//     await session.startTransaction();


//     const tenantId = req.params.id;

//     if (req.body.tenant_name || req.body.tenant_short_name) {
//       throw new Error("tenant_name and tenant_short_name cannot be updated");
//     }

//     const allowedFields = [
//       "tenant_cin", "tenant_gstn", "domain", "address1", "address2",
//       "city", "district", "state", "pincode",
//       "admin_mobile_number", "admin_whatsapp_number", "admin_email", "status"
//     ];

//     const updateFields = {};
//     allowedFields.forEach(field => {
//       if (req.body[field] !== undefined) {
//         updateFields[field] = req.body[field];
//       }
//     });

//     if (Object.keys(updateFields).length === 0) {
//       throw new Error("No valid fields provided for update");
//     }

//     const tenant = await Tenant.findByIdAndUpdate(
//       tenantId,
//       { $set: updateFields },
//       { new: true, runValidators: true, session }
//     );

//     if (!tenant) {
//       throw new Error("Tenant not found");
//     }

//     const empUpdate = {};
//     const userUpdate = {};

//     if (updateFields.admin_email) {
//       empUpdate.email = updateFields.admin_email;
//       userUpdate.email = updateFields.admin_email;
//     }

//     if (updateFields.admin_mobile_number) {
//       empUpdate.mobile_number = updateFields.admin_mobile_number;
//     }

//     if (Object.keys(empUpdate).length > 0) {
//       await Employee.updateMany(
//         { tenant_id: tenantId },
//         { $set: empUpdate },
//         { session }
//       );
//     }

//     if (Object.keys(userUpdate).length > 0) {
//       await User.updateMany(
//         { tenant_id: tenantId },
//         { $set: userUpdate },
//         { session }
//       );
//     }

//     await session.commitTransaction();

//     await logger.audit(
//       req.user.employee_id,
//       req.user.name,
//       req.user.role,
//       "update",
//       "tenant",
//       `Tenant ${tenant.tenant_name} updated`,
//       "success",
//       tenant._id,
//       requestId
//     );

//     return res.status(200).json({
//       message: "Tenant updated successfully",
//       tenant
//     });

//   } catch (err) {
//     await session.abortTransaction();

//     await logger.error(
//       req.user?.employee_id || "SYSTEM",
//       req.user?.name || "SYSTEM",
//       req.user?.role || "unknown",
//       err,
//       "tenantUpdate",
//       null,
//       requestId
//     );

//     return res.status(400).json({ message: err.message });

//   } finally {
//     session.endSession();
//   }
// };

// /**
//  * Delete a tenant (Super Admin only)
//  * DELETE /api/platform/tenants/:id
//  * Checks if tenant has users or clients before deletion.
 
//  * Note: Check if tenant user / clients found then dont delete else delete
//  * whenever a Super Admin tries to delete a tenant, 
//  * the system first checks if there are users or clients linked to that tenant. 
//  * If yes, deletion is blocked with a clear message. 
//  * If no, deletion proceeds safely.
//  */

// exports.deleteTenant = async (req, res, next) => {
//   const requestId = req.headers['x-request-id'] || null;

//   try {
//     const tenantId = req.params.id;

//     // Step 1: Check if tenant exists
//     const tenant = await Tenant.findById(tenantId);
//     if (!tenant) return res.status(404).json({ error: "Tenant not found" });

//     // Step 2: Check for users belonging to this tenant
//     const tenantUsersCount = await User.countDocuments({ tenant_id: tenantId });
//     if (tenantUsersCount > 0) {
//       return res.status(400).json({
//         error: "Tenant has associated users. Please delete users first.",
//         usersCount: tenantUsersCount
//       });
//     }

//     // Step 3: Check for client profiles belonging to this tenant
//     const clientProfilesCount = await ClientProfile.countDocuments({ tenant_id: tenantId });
//     if (clientProfilesCount > 0) {
//       return res.status(400).json({
//         error: "Tenant has associated client profiles. Please delete clients first.",
//         clientsCount: clientProfilesCount
//       });
//     }

//     // Step 4: Safe to delete tenant
//     await Tenant.findByIdAndDelete(tenantId);

//     await logger.audit(
//       req.user.employee_id,
//       req.user.employee_id.name,   // NEW: pass employee name
//       req.user.role,
//       "delete",
//       "tenant",
//       `Tenant ${tenant.name} deleted`,
//       "success",
//       tenantId,
//       requestId
//     );

//     res.json({ message: "Tenant deleted successfully" });
//   } catch (err) {
//     await logger.error(
//       req.user?.employee_id || "SYSTEM",
//       req.user?.employee_id?.name || "SYSTEM",
//       req.user?.role || "unknown",
//       err,
//       "tenantDelete",
//       null,
//       requestId,
//       500
//     );
//     next(err);
//   }
// };
