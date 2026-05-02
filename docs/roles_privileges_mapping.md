Role-to-Privilege Mapping

Role	Scope	Key Privileges	Typical Routes to Protect
Super Admin	System	create, read, update, delete, provision_tenant, manage_billing, audit_logs, manage_configs, manage_roles	Role CRUD (/roles), tenant provisioning, billing, audit logs, system configs
System Manager	System	read, update, monitor_usage, manage_configs	Platform monitoring, config management
System Executive	System	read, create_reports, export_data	Analytics dashboards, reporting APIs
Helpdesk	System	read, impersonate_user	Support tools, impersonation endpoints
Platform User	System	read, update_limited	General platform usage
Tenant Admin	Tenant	create, read, update, delete, manage_users, audit_logs	Tenant user management, GPS provisioning, audit logs
Tenant Manager	Tenant	create, read, update, assign_resources, manage_clients	Client onboarding, vehicle creation, GPS mapping
Tenant Executive	Tenant	read, create_reports, export_data	Tenant analytics, reporting APIs
Tenant Helpdesk	Tenant	read, support_tickets	Support ticket APIs
Tenant User	Tenant	read, update_limited	Limited tenant operations (drivers/operators)
Fleet Operator	Tenant	read, update_trip_status, report_issue	Trip progress updates, incident reporting
Client Admin	Tenant	create_resources, read_resources, update_resources, delete_resources, manage_client_users	Client resource CRUD, driver management, trip approval
Client Manager	Tenant	create_resources, read_resources, update_resources	Trip creation, driver assignment, vehicle resource management
Client Operator	Tenant	read_resources, update_resources	Trip operations, vehicle/trip updates
Client Viewer	Tenant	read_resources	Read-only dashboards, trip replay, driver/vehicle mapping view

Examples: How to Use With authMiddleware

For Super Admin role management:

router.post('/roles', authMiddleware(['manage_roles']), roleController.createRole);

For Tenant vehicle creation:
router.post('/vehicles', authMiddleware(['assign_resources']), vehicleController.createVehicle);

For Client trip creation:
router.post('/trips', authMiddleware(['create_resources']), tripController.createTrip);

For Fleet operator trip status update:

router.put('/trips/:id/status', authMiddleware(['update_trip_status']), tripController.updateStatus);

This table ensures you can quickly map roles → privileges → routes. It keeps your RBAC model consistent, auditable, and easy to extend.

