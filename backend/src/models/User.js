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
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);