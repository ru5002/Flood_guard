// models/SMSLog.js
const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema({
  phoneNumber: String,
  message: String,
  status: { type: String, default: "SENT" },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SMSLog || mongoose.model("SMSLog", smsLogSchema);