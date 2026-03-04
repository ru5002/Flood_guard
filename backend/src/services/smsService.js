const SMSLog = require("../models/SMSLog");

// Simulated SMS sender (free)
const sendSMS = async (phoneNumber, message) => {
  console.log("📱 SMS SENT (Simulated):", phoneNumber, message);

  await SMSLog.create({
    phoneNumber,
    message,
    status: "SENT",
  });

  return { success: true };
};

module.exports = { sendSMS };