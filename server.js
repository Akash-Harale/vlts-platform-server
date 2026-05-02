require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const requestIdMiddleware = require('./middleware/requestIdMiddleware');
const auditMiddleware = require('./middleware/auditMiddleware');
const bodyParser = require("body-parser");
const cors = require("cors");

// Import consolidated routes
const routes = require('./routes/index');

const app = express();

// -------------------- Middleware --------------------
const allowedOrigins = process.env.CORS_ORIGIN.split(",");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow Postman/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.error("Blocked by CORS:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

// Attach request ID + audit middleware globally
app.use(requestIdMiddleware);
app.use(auditMiddleware);

// -------------------- Routes --------------------
app.use(routes);

// -------------------- Error Handler --------------------
app.use((err, req, res, next) => {
  logger.error(
    req.user?.employee_id?.emp_id || "SYSTEM",
    req.user?.employee_id?.name || "SYSTEM",
    req.user?.role || "unknown",
    err,
    "server",
    req.user?.tenant_id || null,
    req.trace_id || null
  );
  res.status(500).json({ error: "Internal server error" });
});

// -------------------- Server Startup --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
