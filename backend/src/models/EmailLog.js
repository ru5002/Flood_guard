const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
    email:      { type: String, required: true },
    subject:    { type: String, default: null },
    status:     { type: String, enum: ["SENT", "FAILED", "SIMULATED"], default: "SIMULATED" },
    zone:       { type: String, default: null },
    riskLevel:  { type: String, default: null },
    sentBy:     { type: String, default: "system" },
    alertTitle: { type: String, default: null },
    sentAt:     { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
