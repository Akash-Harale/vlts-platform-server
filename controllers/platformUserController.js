// Platform User Controller
// platformUserController.js
// 23/03/2026
// Purpose: Super Admin can CRUD platform users (system_manager, system_executive, helpdesk, platform_user).
// These users are not tied to tenants or clients.
// RBAC enforced via "manage_roles". Audit logs record all actions.
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Role = require('../models/roleModel');
const Employee = require('../models/employeeModel');
const logger = require('../utils/logger');
//const { generateEmpId } = require('../utils/empIdGenerator');

/**
 * Create a new platform user
 * Body: { name, email, password, roleName }
 */
exports.createPlatformUser = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || null;

  const MAX_RETRIES = parseInt(process.env.TRANSACTION_MAX_RETRIES || "3", 10);
  const BASE_DELAY_MS = parseInt(process.env.TRANSACTION_BACKOFF_MS || "100", 10);

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const session = await mongoose.startSession();

    try {
      attempt++;

      const result = await session.withTransaction(async () => {
        const { name, email, mobile_number, designation, password, roleName } = req.body;

        const role = await Role.findOne({ name: roleName }).session(session);
        if (!role || role.scope !== "system") {
          throw new Error("Invalid system role");
        }

        const duplicate_employee = await Employee.findOne({
          email: email.toLowerCase().trim()
        }).session(session);

        if (duplicate_employee) {
          throw new Error("Duplicate User...Email already exist!");
        }

        const employee = await Employee.create([{
          name,
          email,
          mobile_number,
          designation,
          scope: "system",
          tenant_id: null,
          client_profile_id: null
        }], { session });

        const duplicate_user = await User.findOne({
          email: email.toLowerCase().trim()
        }).session(session);

        if (duplicate_user) {
          throw new Error("Duplicate User...Email already exist!");
        }

        const user = await User.create([{
          employee_id: employee[0]._id,
          email,
          password,
          role: role._id,
          scope: "system"
        }], { session });

        return { employee: employee[0], user: user[0] };
      });

      session.endSession();

      if (result) {
        await logger.audit(
          req.user.employee_id,
          req.user.name,
          req.user.role,
          "create",
          "system_user",
          `system user ${result.employee.name} (${result.employee._id}) created`,
          "success",
          null,
          requestId
        );

        return res.status(201).json(result.user);
      }

    } catch (err) {
      session.endSession();

      if (err.errorLabels && (err.errorLabels.includes("TransientTransactionError") || err.errorLabels.includes("UnknownTransactionCommitResult"))) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      let status_code = 500;
      let message = err.message;

      if (err.code === 11000) {
        status_code = 409;
        message = "Duplicate User...Email already exist!";
      }

      await logger.error(
        req.user?.employee_id || "SYSTEM",
        req.user?.name || "SYSTEM",
        req.user?.role || "unknown",
        err,
        "system_user",
        null,
        requestId,
        status_code
      );

      return res.status(status_code).json({ message });
    }
  }
};
// exports.createPlatformUser = async (req, res, next) => {
//   try {
//     const { name, email, mobile_number, designation, password, roleName } = req.body;

//     // Validate role is system-scoped
//     const role = await Role.findOne({ name: roleName });
//     if (!role || role.scope !== "system") {
//       return res.status(400).json({ error: "Invalid system role" });
//     }

//     // Check duplicate email id 
//     const duplicate_employee = await Employee.findOne({
//       email: email.toLowerCase().trim() 
//     });

//    if (duplicate_employee) {
//       console.log('platformUserController: createPlatformUser API: Duplicate Employee...Email already exist!');
//       return res.status(409).json({ message: 'Duplicate User...Email already exist!' });
//     }

//     // Generate composite emp_id for platform employee
//     //const emp_id = await generateEmpId("system");

//     // Create Employee record
//     const employee = await Employee.create({
//       //emp_id,
//       name,
//       email,
//       mobile_number,
//       designation,
//       scope: "system",
//       tenant_id: null,
//       client_profile_id: null
//     });
  

//         // Check duplicate email id 
//     const duplicate_user = await User.findOne({
//       email: email.toLowerCase().trim() 
//     });

//    if (duplicate_user) {
//       console.log('platformUserController: createPlatformUser API: Duplicate User...Email already exist!');
//       return res.status(409).json({ message: 'Duplicate User...Email already exist!' });
//     }

//     // Create User linked to Employee
//     const user = await User.create({
//       employee_id: employee._id,
//       email,
//       password,
//       role: role._id,
//       scope: "system"
//     });

//     // Audit log
//     await logger.audit(
//       req.user.employee_id,
//       req.user.name,   // NEW: pass employee name
//       req.user.role,
//       "create",
//       "system_user",
//       `system user ${employee.name} (${employee._id}) created`,
//       "success",
//       null,
//       req.trace_id
//     );

//     res.status(201).json(user);
//   } catch (err) {
  
//     let message = err.message;
//     status_code = 500;

//     await logger.error(
//       req.user?.employee_id || "SYSTEM",
//       req.user?.name || "SYSTEM", 
//       req.user?.role || "unknown",
//       err, 
//       "system_user",
//       null,
//       req.trace_id,
//       status_code
//     );

//     if (err.code === 11000) {
//       status_code = 409;
//       message = "Duplicate User...Email already exist!";
//     } 
//       console.error('Error Code:', err.code, ' Error Message:', err.message);
//       return res.status(status_code).json({ message });
//     //next(err.message);
//   }
// };

/**
 * Get all platform users
 */
exports.getPlatformUsers = async (req, res, next) => {
  try {
    const users = await User.find({ tenant_id: null, client_profile_id: null })
      .populate('role')
      .populate('employee_id');

      // Handle if no users found scenario
    
    res.json(users);
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "system_user",
      null,
      req.trace_id
    );
    next(err);
  }
};

/**
 * get platform user by ID
 */
exports.getPlatformUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const filter = {
      _id: id,
      tenant_id: null,
      client_profile_id: null
    };

    const user = await User.findOne(filter)
      .populate('role')
      .populate('employee_id');

    if (!user) {
      return res.status(404).json({ message: "Platform user not found" });
    }

    res.json(user);

  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM",
      req.user?.role || "unknown",
      err,
      "system_user",
      null,
      req.trace_id
    );
    next(err);
  }
};

/**
 * Update platform user
 */
exports.updatePlatformUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { roleName, designation, mobile_number } = req.body;
    const userId = req.params.id;

    if (!roleName && !designation && !mobile_number) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "At least one field (roleName, designation, mobile_number) is required"
      });
    }

    const user = await User.findOne({
      _id: userId,
      tenant_id: null,
      client_profile_id: null
    }).populate('role').session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Platform user not found" });
    }

    // ROLE UPDATE — lookup by name, validate system scope
    if (roleName) {
      const newRole = await Role.findOne({ name: roleName, scope: "system" }).session(session);

      if (!newRole) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Invalid system role: ${roleName}` });
      }

      if (user.role._id.toString() === newRole._id.toString()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ message: `User already has role ${roleName}` });
      }

      user.role = newRole._id;
      await user.save({ session });
    }

    // EMPLOYEE UPDATE
    const empUpdate = {};
    if (designation)    empUpdate.designation    = designation;
    if (mobile_number)  empUpdate.mobile_number  = mobile_number;

    if (Object.keys(empUpdate).length > 0) {
      await Employee.findByIdAndUpdate(
        user.employee_id,
        { $set: empUpdate },
        { new: true, runValidators: true, session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logger.audit(
      req.user.employee_id,
      req.user.name,
      req.user.role,
      "update",
      "system_user",
      `System user updated (${userId})`,
      "success",
      null,
      req.trace_id
    );

    return res.status(200).json({ message: "Platform user updated successfully" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.name || "SYSTEM",
      req.user?.role || "unknown",
      err, "system_user", null, req.trace_id
    );

    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete platform user
 */
exports.deletePlatformUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      tenant_id: null,
      client_profile_id: null
    }).populate('employee_id');

    if (!user) return res.status(404).json({ error: "Platform user not found" });

    // Cascade delete Employee record
    await Employee.findByIdAndDelete(user.employee_id._id);

    await logger.audit(
      req.user.employee_id,
      req.user.employee_id.name,   // NEW: pass employee name
      req.user.role,
      "delete",
      "system_user",
      `System user ${user.employee_id.name} (${user.employee_id}) deleted`,
      "success",
      null,
      req.trace_id
    );

     res.status(201).json({ 
      message: "Platform user deleted successfully" 
    });
  } catch (err) {
    await logger.error(
      req.user?.employee_id || "SYSTEM",
      req.user?.employee_id?.name || "SYSTEM", 
      req.user?.role || "unknown",
      err,
      "system_user",
      null,
      req.trace_id
    );
    next(err);
  }
};


