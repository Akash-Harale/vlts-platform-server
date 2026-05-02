// scripts/bootstrapRolesAndSuperAdmin.js
// Run once: node scripts/bootstrapRolesAndSuperAdmin.js
// Purpose: Seed system, tenant, and client roles + bootstrap Super Admin
// Date: 23 March 2026
// Author: Suresh Gupta

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Role = require('../models/roleModel');
const User = require('../models/userModel');
const Employee = require('../models/employeeModel');
const logger = require('../utils/logger');
//const { generateEmpId } = require('../utils/empIdGenerator');

async function seedRoles() {
  const roles = [
    // System roles
    { name: "super_admin", privileges: ["create","read","update","delete",
      "provision_tenant","manage_billing","audit_logs","manage_configs","create_roles","read_roles",
       "update_roles", "delete_roles"], scope: "system", remarks: "Reserved for vendor/operator; full system control" },
    { name: "system_manager", privileges: ["read","update","monitor_usage","manage_configs"], scope: "system", remarks: "Ops/Tech managers; manage configs and monitor usage" },
    { name: "system_executive", privileges: ["read","create_reports","export_data"], scope: "system", remarks: "Analytics teams; reporting only" },
    { name: "helpdesk", privileges: ["read","impersonate_user"], scope: "system", remarks: "Support role; impersonation must be logged" },
    { name: "system_user", privileges: ["read","update_limited"], scope: "system", remarks: "Universal but tightly scoped" },

    // Tenant roles
    { name: "tenant_admin", privileges: ["create_user","read_user","update_user","delete_user",
      "manage_clients","audit_logs", "create_gps", "update_gps", "read_gps", "delete_gps",
       "create_heartbeat", "map_device_to_vehicle","read_mapped_device_to_vehicle",
        "update_mapped_device_to_vehicle", "delete_mapped_device_to_vehicle","read_roles", "create_vehicle",
      "read_vehicle", "update_vehicle", "delete_vehicle"], scope: "tenant", remarks: "Full control within tenant domain; provisions GPS devices" },
    { name: "tenant_manager", privileges: ["create_client","read_client","update_client","assign_resources"], scope: "tenant", remarks: "Onboards clients, creates vehicles, maps GPS devices to vehicles" },
    { name: "tenant_executive", privileges: ["read","create_reports","export_data"], scope: "tenant", remarks: "Client-side analytics; reporting only" },
    { name: "tenant_helpdesk", privileges: ["read","support_tickets"], scope: "tenant", remarks: "Scoped to client resources; handles support tickets" },
    { name: "tenant_user", privileges: ["read","update_limited"], scope: "tenant", remarks: "Universal role, often drivers/operators; limited updates" },
    { name: "fleet_operator", privileges: ["read","update_trip_status","report_issue"], scope: "tenant", remarks: "Assigned to vehicles/trips; can update trip progress and report incidents" },

    // Client roles (refactored to scope: client)
    { name: "client_admin", privileges: ["create_user","read_user","update_user","delete_user",
      "manage_resources","approve_trips","create_trips", "read_trips", "update_trips",
    "delete_trips", "create_driver", "read_driver", "update_driver", "delete_driver",
  "create_driver_assignment", "read_driver_assignment", "update_driver_assignment",
   "delete_driver_assignment", "check_availability"], scope: "client", remarks: "Full control of client resources and users; approves trips and manages drivers" },
    { name: "client_manager", privileges: ["create_resources","read_resources","update_resources"], scope: "client", remarks: "Manage fleet resources; creates trips, adds drivers, reviewed by admin" },
    { name: "client_operator", privileges: ["read_resources","update_trip_status","report_issue"], scope: "client", remarks: "Operate assigned vehicles/trips; update trip progress" },
    { name: "client_viewer", privileges: ["read_resources","export_reports"], scope: "client", remarks: "Read-only access to dashboards/reports; replay trips and view driver/vehicle mappings" }
  ];

  for (const role of roles) {
    const exists = await Role.findOne({ name: role.name });
    if (!exists) {
      await Role.create(role);
      console.log(`Role created: ${role.name}`);
      await logger.audit("SYSTEM","bootstrap","create","role",JSON.stringify(role),"success",null,null);
    } else {
      console.log(`Role already exists: ${role.name}`);
      await logger.audit("SYSTEM","bootstrap","skip","role",`Role ${role.name} already exists, skipped seeding`,"success",null,null);
    }
  }
}

async function seedSuperAdmin() {
  const superAdminRole = await Role.findOne({ name: "super_admin" });
  if (!superAdminRole) {
    const err = new Error("Super Admin role not found");
    await logger.error("SYSTEM","bootstrap",err,"roles-bootstrap",null,null,500);
    throw err;
  }

  const existingUser = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
  if (existingUser) {
    console.log(`Super Admin user already exists: ${existingUser.email}`);
    await logger.audit("SYSTEM","bootstrap","skip","super_admin_user",`Super Admin ${existingUser.email} already exists`,"success",null,null);
    return;
  }

  // Step 1: Generate emp_id for Super Admin employee
  //const emp_id = await generateEmpId("system");

  // Step 2: Create Employee record
  const employee = await Employee.create({
    //emp_id,
    name: process.env.SUPER_ADMIN_NAME || "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "suresh.gupta@nutantek.com",
    scope: "system",
    tenant_id: null
  });

  // Step 3: Create User linked to Employee
  const user = await User.create({
    email: process.env.SUPER_ADMIN_EMAIL || "suresh.gupta@nutantek.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "nutan123", // rotate later
    role: superAdminRole._id,
    scope: "system",
    tenant_id: null,
    employee_id: employee._id
  });

  console.log(`Super Admin user created: ${user.email} with emp_id ${employee.emp_id}`);
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
    await logger.error("SYSTEM","bootstrap",err,"roles-bootstrap",null,null,500);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
    process.exit(0);
  }
})();
