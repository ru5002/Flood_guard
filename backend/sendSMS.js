require("dotenv").config();

const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const toNumber = process.argv[2] || process.env.TWILIO_TEST_TO_NUMBER;
const body = process.argv.slice(3).join(" ") || "Hello from FloodGuard";

const normalizeSriLankanPhone = (phoneNumber = "") => {
    const compact = String(phoneNumber).replace(/[^\d+]/g, "");
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("94")) return `+${compact}`;
    if (compact.startsWith("0") && compact.length === 10) return `+94${compact.slice(1)}`;
    return compact;
};

const sendSMS = async () => {
    if (!accountSid || !authToken) {
        throw new Error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env");
    }

    if (!toNumber) {
        throw new Error("Add TWILIO_TEST_TO_NUMBER to backend/.env or pass a number after the command.");
    }

    if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_FROM_NUMBER) {
        throw new Error("Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER in backend/.env");
    }

    const client = twilio(accountSid, authToken);
    const msgOptions = {
        body,
        to: normalizeSriLankanPhone(toNumber),
    };

    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        msgOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
        msgOptions.from = process.env.TWILIO_FROM_NUMBER;
    }

    const message = await client.messages.create(msgOptions);
    console.log("SMS sent successfully");
    console.log("SID:", message.sid);
    console.log("Status:", message.status);
    console.log("To:", msgOptions.to);
};

sendSMS().catch((error) => {
    console.error("SMS failed:", error.message);
    process.exit(1);
});
