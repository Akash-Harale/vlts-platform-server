// /utils/reportUserQueries.js
// Created n 6 April 2026
// Purpose: To handle various report generation on Users/Employee Models
/*
1. List of Users for each scope like system, tenant, client 
2. List of users for a given scope and a given role or all roles
3. List of users for a given role
4. List employees for a given scope with role or for a given role

Redesing benefits:
Denormalized scope in User → direct queries without always joining Employee.
Indexes on scope + role → faster filtering for reports.
Virtuals → clean reverse population (Employee → User).
Utility functions → reusable, centralized reporting logic.
*/

const User = require('../models/userModel');
const Employee = require('../models/employeeModel');

/**
 * 1. List of Users for each scope
 */
async function listUsersByScope(scope) {
  return await User.find({ scope })
    .populate('employee_id', 'name email designation')
    .populate('role', 'name');
}

/**
 * 2. List of Users for a given scope and role (or all roles)
 */
async function listUsersByScopeAndRole(scope, roleId = null) {
  const filter = { scope };
  if (roleId) filter.role = roleId;

  return await User.find(filter)
    .populate('employee_id', 'name email designation')
    .populate('role', 'name');
}

/**
 * 3. List of Users for a given role
 */
async function listUsersByRole(roleId) {
  return await User.find({ role: roleId })
    .populate('employee_id', 'name email scope')
    .populate('role', 'name');
}

/**
 * 4. List Employees for a given scope with role or for a given role
 */
async function listEmployeesByScopeOrRole(scope = null, roleId = null) {
  const filter = {};
  if (scope) filter.scope = scope;

  return await Employee.find(filter)
    .populate({
      path: 'user',
      match: roleId ? { role: roleId } : {},
      select: 'email role scope',
      populate: { path: 'role', select: 'name' }
    });
}

module.exports = {
  listUsersByScope,
  listUsersByScopeAndRole,
  listUsersByRole,
  listEmployeesByScopeOrRole
};

