// // /models/tenantModel.js

const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenant_name: { type: String, required: true },

  tenant_short_name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

  tenant_cin: { type: String, unique: true },
  tenant_gstn: { type: String, unique: true },

  domain: { type: String },

  address1: { type: String },
  address2: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },

  auth_methods: {
    type: [String],
    default: ["local"]
  },

  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active"
  },

  created_at: {
    type: Date,
    default: Date.now
  }

}, { collection: 'tenants' });

module.exports = mongoose.model('Tenant', tenantSchema);




// const mongoose = require('mongoose');

// const tenantSchema = new mongoose.Schema({
//   //tenant_id: { type: String, required: true, unique: true },
//   tenant_name: { type: String, required: true },
//   tenant_short_name: { type: String, required: true, unique: true },
//   tenant_cin: { type: String, required: true, unique: true },
//   tenant_gstn: { type: String, required: true, unique: true },
//   domain: { type: String },
//   address1: { type: String },
//   address2: { type: String },
//   city: { type: String },
//   district: { type: String },
//   state: { type: String },
//   pincode: { type: String },
//   mobile_number: { type: String },
//   whatsapp_number: { type: String },
//   email_id: { type: String, required: true },
//   auth_methods: { type: [String], default: ["local"] },
//   status: { type: String, enum: ["active", "suspended"], default: "active" },
//   created_at: { type: Date, default: Date.now }
// }, { collection: 'tenants' });

// module.exports = mongoose.model('Tenant', tenantSchema);