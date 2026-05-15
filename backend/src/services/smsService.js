/**
 * smsService.js
 * Sends SMS via Twilio if credentials are configured, otherwise simulates.
 *
 * Required env vars for real SMS:
 *   TWILIO_ACCOUNT_SID  — e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN   — your auth token
 *   TWILIO_FROM_NUMBER  — your Twilio phone number e.g. +14155552671
 *
 * Without those vars the service logs to console and writes a DB record
 * with status "SIMULATED" — useful for demos / development.
 */

const SMSLog = require("../models/SMSLog");

const isTwilioConfigured = () =>
    !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
    );

const normalizeSriLankanPhone = (phoneNumber = "") => {
    const compact = String(phoneNumber).replace(/[^\d+]/g, "");
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("94")) return `+${compact}`;
    if (compact.startsWith("0") && compact.length === 10) return `+94${compact.slice(1)}`;
    return compact;
};

const safeLogSMS = async (data) => {
    try {
        await SMSLog.create(data);
    } catch (err) {
        console.warn(`[SMS] Could not save SMS log: ${err.message}`);
    }
};

/**
 * Send a single SMS.
 * @param {string} phoneNumber  E.164 format preferred (+94771234567)
 * @param {string} message      The SMS body
 * @param {object} meta         Optional: { zone, riskLevel, sentBy, alertTitle }
 * @returns {{ success: boolean, sid?: string, simulated?: boolean }}
 */
const sendSMS = async (phoneNumber, message, meta = {}) => {
    const normalizedPhone = normalizeSriLankanPhone(phoneNumber);
    const logData = {
        phoneNumber: normalizedPhone,
        message,
        zone:       meta.zone       || null,
        riskLevel:  meta.riskLevel  || null,
        sentBy:     meta.sentBy     || "system",
        alertTitle: meta.alertTitle || null,
    };

    if (isTwilioConfigured()) {
        try {
            const twilio = require("twilio");
            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            const messagePayload = {
                body: message,
                to:   normalizedPhone,
            };

            if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                messagePayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
            } else {
                messagePayload.from = process.env.TWILIO_FROM_NUMBER;
            }

            const result = await client.messages.create(messagePayload);

            await safeLogSMS({ ...logData, status: "SENT", twilioSid: result.sid });
            console.log(`[SMS] Sent via Twilio to ${normalizedPhone}  sid=${result.sid}`);
            return { success: true, sid: result.sid };
        } catch (err) {
            console.error(`[SMS] Twilio error for ${normalizedPhone}:`, err.message);
            await safeLogSMS({ ...logData, status: "FAILED", errorMessage: err.message });
            return { success: false, error: err.message };
        }
    }

    // Simulation mode
    console.log(`[SMS SIMULATED] To: ${normalizedPhone}`);
    console.log(`[SMS SIMULATED] Message: ${message}`);
    await safeLogSMS({ ...logData, status: "SIMULATED" });
    return { success: true, simulated: true };
};

/**
 * Bulk-send SMS to a list of phone numbers.
 * Returns summary: { sent, failed, simulated }
 */
const sendBulkSMS = async (phoneNumbers, message, meta = {}) => {
    let sent = 0, failed = 0, simulated = 0;

    for (const phone of phoneNumbers) {
        const result = await sendSMS(phone, message, meta);
        if (!result.success)         failed++;
        else if (result.simulated)   simulated++;
        else                          sent++;
    }

    return { sent, failed, simulated, total: phoneNumbers.length };
};

module.exports = { sendSMS, sendBulkSMS, isTwilioConfigured, normalizeSriLankanPhone };
