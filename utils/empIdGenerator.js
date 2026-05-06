// /utils/empIdGenerator.js
// 24/03/2026

const { SerialTracker } = require('../models/serialTrackerModel');

/**
 * Generate Employee ID based on scope
 * @param {String} scope - "platform" | "tenant" | "client"
 * @param {ObjectId} tenant_id - optional tenant reference
 * @param {ObjectId} client_profile_id - optional client reference
 */
async function generateEmpId(scope, tenant_id = null, client_profile_id = null) {
  let trackerQuery = { scope };
  //if (scope === "tenant") trackerQuery.tenant_id = tenant_id;
  if (scope === "client") {
    trackerQuery.tenant_id = tenant_id;
    trackerQuery.client_profile_id = client_profile_id;
  }

  console.log('trackerQeuery: ', trackerQuery);

  // Atomically increment serial
  const tracker = await SerialTracker.findOneAndUpdate(
    trackerQuery,
    { $inc: { current_serial: 1 } },
    { new: true, upsert: true }
  );

  console.log('tracker', tracker);

  const serial = tracker.current_serial;

  console.log('serial number fetched:', serial);

  // Build composite emp_id
  if (scope === "system") {
    return `SYSTEME${serial}`;
  }
  if (scope === "tenant") {
    // tenant serial is derived from tracker for tenant itself
    //const tenantTracker = await SerialTracker.findOne({ scope: "tenant", tenant_id });
    const tenantSerial = tenantTracker ? tenantTracker.current_serial : "101";

    console.log('tenantTracker: ', tenantTracker,'tenantserial', tenantSerial);

    return `T${tenantSerial}E${serial}`;
  }
  if (scope === "client") {
    const tenantTracker = await SerialTracker.findOne({ scope: "tenant", tenant_id });
    const tenantSerial = tenantTracker ? tenantTracker.current_serial : "101";

    const clientTracker = await SerialTracker.findOne({ scope: "client", tenant_id, client_profile_id });
    const clientSerial = clientTracker ? clientTracker.current_serial : "101";

    return `T${tenantSerial}C${clientSerial}E${serial}`;
  }
}

module.exports = { generateEmpId };
