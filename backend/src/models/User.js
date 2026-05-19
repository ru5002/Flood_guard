const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    phone:         { type: String, required: true },
    password:      { type: String, required: true },
    zone:          { type: String, default: "Gampaha" },
    address:       { type: String },
    isActive:      { type: Boolean, default: true },
    alertsEnabled: { type: Boolean, default: true },

    // Password reset: short-lived 6-digit code (stored as hash) + expiry + attempt counter
    resetCodeHash:    { type: String, default: null },
    resetCodeExpires: { type: Date,   default: null },
    resetCodeAttempts:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);