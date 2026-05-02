// db.js
// Date: 22 Jan 2026
// Author: Suresh Gupta
// Purpose: To make the MongoDB connection 

require('dotenv').config(); // Ensure this is at the top
const mongoose = require('mongoose');
//const { sendAlertEmail } = require('../services/mailer');
//const { initializeSerialTrackers } = require('../models/serialTrackerModel');

let retryCount = 0;
const maxRetries = 5;
const baseDelay = 2000;//miliseconds
const pingInterval = 600000; // 600000 Milliseconds = 600 sec = 5 Min

const connectDB = async () => {
  try {
    console.log('MONGO_URI: ', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    monitorHealth();
  } catch (err) {
    retryCount++;
    console.error(`MongoDB connection failed [Attempt ${retryCount}]:`, err.message);

    if (retryCount <= maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`Retrying in ${delay / 1000}s...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('MongoDB Connection - Max retries reached. Exiting...');
      //sendAlertEmail('MongoDB connection failed after max retries', err.message);
      process.exit(1);
    }
  }
};

function monitorHealth() {
  setInterval(async () => {
    try {
      await mongoose.connection.db.admin().ping();
      console.log(`[${new Date().toISOString()}] Success! MongoDB ping successful`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failure! MongoDB ping failed:`, err.message);
      //sendAlertEmail('MongoDB ping failed', err.message);
      //sendAlertEmail('db_failure', err.message);
    }
  }, pingInterval);
}

connectDB();
// connectDB().then(async () => {
//   await initializeSerialTrackers();
// });

module.exports = connectDB;


