const User = require("../models/User");
const SMSLog = require("../models/SMSLog");
const { sendBulkSMS, isTwilioConfigured } = require("./smsService");

const ALERT_RISKS = new Set(["Moderate", "High", "Critical"]);
const AUTO_SENT_BY = "auto-risk-monitor";
const DEFAULT_COOLDOWN_MINUTES = 360;

const ZONE_ALIASES = {
    "Gampaha City": ["Gampaha", "Gampaha City"],
    Gampaha: ["Gampaha", "Gampaha City"],
    "Ja-Ela": ["Ja-Ela", "Ja Ela", "Jaela"],
    Attanagalla: ["Attanagalla", "Attanagalu", "Aththanagalla"],
    Nittambuwa: ["Nittambuwa"],
    Veyangoda: ["Veyangoda"],
    Negombo: ["Negombo"],
    Katunayake: ["Katunayake"],
    Minuwangoda: ["Minuwangoda"],
    Divulapitiya: ["Divulapitiya"],
    Mirigama: ["Mirigama"],
    Wattala: ["Wattala"],
    Kelaniya: ["Kelaniya"],
    Peliyagoda: ["Peliyagoda"],
    Kiribathgoda: ["Kiribathgoda"],
    Kadawatha: ["Kadawatha"],
    Ragama: ["Ragama"],
    Biyagama: ["Biyagama"],
    Dompe: ["Dompe"],
};

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unique = (items) => [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];

const aliasesForZone = (zone) => unique([zone, ...(ZONE_ALIASES[zone] || [])]);

const cooldownMinutes = () => {
    const configured = Number(process.env.AUTO_ALERT_COOLDOWN_MINUTES);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_COOLDOWN_MINUTES;
};

const riskRank = { Moderate: 2, High: 3, Critical: 4 };

const emergencyMessage = (prediction) => {
    const zone = prediction.location || prediction.zone || "your area";
    const risk = prediction.riskLevel;
    const probability = Number(prediction.floodProbability);
    const probabilityText = Number.isFinite(probability)
        ? ` Flood probability is ${Math.round(probability * 100)}%.`
        : "";

    if (risk === "Critical") {
        return `FloodGuard CRITICAL ALERT: Immediate flood risk in ${zone}.${probabilityText} Move to higher ground now and follow official evacuation guidance. DMC: 117.`;
    }

    if (risk === "High") {
        return `FloodGuard HIGH RISK WARNING: Flooding is possible in ${zone}.${probabilityText} Keep essentials ready, avoid low-lying roads, and prepare to evacuate if water rises. DMC: 117.`;
    }

    return `FloodGuard MODERATE RISK ADVISORY: Flood risk is increasing in ${zone}.${probabilityText} Monitor updates, avoid low-lying areas, and keep emergency items ready. DMC: 117.`;
};

const recentlyAlerted = async (zone, riskLevel) => {
    const cutoff = new Date(Date.now() - cooldownMinutes() * 60 * 1000);
    return SMSLog.exists({
        sentBy: AUTO_SENT_BY,
        zone,
        riskLevel,
        sentAt: { $gte: cutoff },
        status: { $in: ["SENT", "SIMULATED"] },
    });
};

const usersForZone = async (zone) => {
    const zonePatterns = aliasesForZone(zone).map((alias) => new RegExp(`^${escapeRegex(alias)}$`, "i"));
    return User.find({
        isActive: true,
        alertsEnabled: true,
        phone: { $exists: true, $ne: "" },
        zone: { $in: zonePatterns },
    }).select("phone name zone").lean();
};

const sortAlertPredictions = (predictions) => [...predictions]
    .filter((prediction) => ALERT_RISKS.has(prediction.riskLevel))
    .sort((a, b) => (riskRank[b.riskLevel] || 0) - (riskRank[a.riskLevel] || 0));

const sendAutomaticRiskAlerts = async (predictions = [], options = {}) => {
    const alertPredictions = sortAlertPredictions(predictions);
    const results = [];

    for (const prediction of alertPredictions) {
        const zone = prediction.location || prediction.zone;
        const riskLevel = prediction.riskLevel;

        if (!zone) {
            results.push({ zone: null, riskLevel, sent: false, reason: "missing-zone" });
            continue;
        }

        if (await recentlyAlerted(zone, riskLevel)) {
            results.push({
                zone,
                riskLevel,
                sent: false,
                reason: "cooldown-active",
                cooldownMinutes: cooldownMinutes(),
            });
            continue;
        }

        const users = await usersForZone(zone);
        if (!users.length) {
            results.push({ zone, riskLevel, sent: false, reason: "no-active-users" });
            continue;
        }

        const message = emergencyMessage(prediction);
        const sendResult = await sendBulkSMS(users.map((user) => user.phone), message, {
            zone,
            riskLevel,
            sentBy: AUTO_SENT_BY,
            alertTitle: `${riskLevel} Automatic Flood Alert - ${zone}`,
        });

        results.push({
            zone,
            riskLevel,
            sent: true,
            recipientCount: users.length,
            results: sendResult,
            twilioActive: isTwilioConfigured(),
            source: options.source || "prediction-risk",
        });
    }

    return {
        checked: alertPredictions.length,
        twilioActive: isTwilioConfigured(),
        cooldownMinutes: cooldownMinutes(),
        results,
    };
};

module.exports = {
    sendAutomaticRiskAlerts,
    emergencyMessage,
    aliasesForZone,
    AUTO_SENT_BY,
};
