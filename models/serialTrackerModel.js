// // /models/serialTrackerModel.js
// // 24/03/2026

// require('dotenv').config(); // Ensure this is at the top
// const mongoose = require('mongoose');
// const logger = require('../utils/logger'); // assuming you have a logger service

// const serialTrackerSchema = new mongoose.Schema({
//   scope: { type: String, enum: ["system", "tenant", "client"], required: true },
//   tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
//   client_profile_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClientProfile" },
//   current_serial: { type: Number, default: 100 } // start from 101
// }, { collection: 'serial_trackers' });

// const SerialTracker = mongoose.model('SerialTracker', serialTrackerSchema);

// async function initializeSerialTrackers() {
//   const count = await SerialTracker.countDocuments();
//   if (count === 0) {
//     const MAX_RETRIES = parseInt(process.env.SEED_MAX_RETRIES || "3", 10);
//     const BASE_DELAY_MS = parseInt(process.env.SEED_BACKOFF_MS || "100", 10);

//     let attempt = 0;
//     const seedDocs = [
//       { scope: "system", current_serial: 100 },
//       { scope: "tenant", current_serial: 100 },
//       { scope: "client", current_serial: 100 }
//     ];

//     while (attempt < MAX_RETRIES) {
//       const session = await mongoose.startSession();
//       try {
//         attempt++;

//         await session.withTransaction(async () => {
//           await SerialTracker.insertMany(seedDocs, { session });
//         });

//         console.log("SerialTracker collection initialized with default documents.");
//         await logger.audit(
//           "SYSTEM",
//           "SYSTEM",
//           "system",
//           "create",
//           "serialTracker",
//           JSON.stringify(seedDocs),
//           "success",
//           null,
//           null
//         );

//         session.endSession();
//         return; // success, exit loop
//       } catch (err) {
//         session.endSession();

//         console.error(`SerialTracker initialization failed [Attempt ${attempt}]:`, err.message);
//         await logger.error(
//           "SYSTEM",
//           "SYSTEM",
//           "system",
//           err,
//           "serialTrackerInitialization",
//           JSON.stringify(seedDocs),
//           null,
//           500
//         );

//         if (attempt < MAX_RETRIES) {
//           const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
//           console.log(`Retrying initialization in ${delay}ms...`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//           continue;
//         } else {
//           console.error("SerialTracker initialization - Max retries reached. Giving up.");
//         }
//       }
//     }
//   }
// }

// module.exports = { SerialTracker, initializeSerialTrackers };
