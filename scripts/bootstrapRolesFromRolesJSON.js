// scripts/bootstrapRolesFromRolesJSON.js
// Run once: node scripts/bootstrapRolesFromRolesJSON.js
// Purpose: Seed system, tenant, and client roles + bootstrap Super Admin
// Date: 23 March 2026
// Author: Suresh Gupta

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const Role = require('../models/roleModel');
const User = require('../models/userModel');
const Employee = require('../models/employeeModel');
const logger = require('../utils/logger');

async function seedRoles() {
  const rolesFile = path.join(__dirname, 'roles.json');  // roles.json - user defined roles data
  const rolesPayload = JSON.parse(fs.readFileSync(rolesFile, 'utf-8'));

  // Validate schemaVersion
  if (!rolesPayload.schemaVersion || rolesPayload.schemaVersion !== "v1") {
    const err = new Error(
      `Invalid or unsupported schemaVersion in roles.json. Found: ${rolesPayload.schemaVersion}`
    );
    await logger.error("SYSTEM", "bootstrap", err, "roles-bootstrap", null, null, 500);
    throw err;
  }

  const roles = rolesPayload.roles;
  if (!Array.isArray(roles)) {
    const err = new Error("roles.json format invalid: 'roles' must be an array");
    await logger.error("SYSTEM", "bootstrap", err, "roles-bootstrap", null, null, 500);
    throw err;
  }

  for (const role of roles) {
    const exists = await Role.findOne({ name: role.name });
    if (!exists) {
      await Role.create(role);
      console.log(`Role created: ${role.name}`);
      await logger.audit("SYSTEM", "bootstrap", "create", "role", JSON.stringify(role), "success", null, null);
    } else {
      console.log(`Role already exists: ${role.name}`);
      await logger.audit("SYSTEM", "bootstrap", "skip", "role", `Role ${role.name} already exists, skipped seeding`, "success", null, null);
    }
  }
}

async function seedSuperAdmin() {
  const superAdminRole = await Role.findOne({ name: "super_admin" });
  if (!superAdminRole) {
    const err = new Error("Super Admin role not found");
    await logger.error("SYSTEM", "bootstrap", err, "roles-bootstrap", null, null, 500);
    throw err;
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "suresh.gupta@nutantek.com";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "nutan123";
  const superAdminName = process.env.SUPER_ADMIN_NAME || "Suresh Gupta";
  const superAdminMobile = process.env.SUPER_ADMIN_MOBILE || "7702000723";
  const superAdminDesignation = process.env.SUPER_ADMIN_DESIGNATION || "Managing Partner";

  const existingUser = await User.findOne({ email: superAdminEmail });
  if (existingUser) {
    console.log(`Super Admin user already exists: ${existingUser.email}`);
    await logger.audit("SYSTEM", "bootstrap", "skip", "super_admin_user", `Super Admin ${existingUser.email} already exists`, "success", null, null);
    return;
  }

 // Step 1: Create Employee record
  const employee = await Employee.create({
    name: superAdminName,
    email: superAdminEmail,
    mobile_number: superAdminMobile,
    designation: superAdminDesignation,
    scope: "system",
    tenant_id: null,
    client_profile_id: null
  });

  // Step 2: Create User linked to Employee
  const user = await User.create({
    employee_id: employee._id,
    email: superAdminEmail,
    password: superAdminPassword, // rotate later
    role: superAdminRole._id,
    scope: "system",
    tenant_id: null,
    client_profile_id: null
  });

  console.log(`Super Admin user created: ${user.email} with emp_id ${employee._id}`);
  await logger.audit(
    employee._id,
    employee.name,
    "super_admin",
    "create",
    "super_admin_user",
    `Super Admin ${user.email} seeded with employee_id ${employee._id}`,
    "success",
    null,
    null
  );
}

(async () => {
  try {
    await connectDB();
    await seedRoles();
    await seedSuperAdmin();
  } catch (err) {
    console.error("Error during bootstrap:", err);
    await logger.error("SYSTEM", "bootstrap", err, "roles-bootstrap", null, null, 500);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
    process.exit(0);
  }
})();
