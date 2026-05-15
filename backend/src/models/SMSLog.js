const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema({
    phoneNumber:  { type: String, required: true },
    message:      { type: String, required: true },
    status:       { type: String, enum: ["SENT", "FAILED", "SIMULATED"], default: "SIMULATED" },
    zone:         { type: String, default: null },
    riskLevel:    { type: String, default: null },
    sentBy:       { type: String, default: "system" },
    alertTitle:   { type: String, default: null },
    twilioSid:    { type: String, default: null },
    errorMessage: { type: String, default: null },
    sentAt:       { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.models.SMSLog || mongoose.model("SMSLog", smsLogSchema);
