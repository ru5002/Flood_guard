/**
 * smsAlertController.js
 * Admin-only endpoints for zone-based SMS flood alert dispatch.
 */

const User    = require("../models/User");
const SMSLog  = require("../models/SMSLog");
const { sendSMS, sendBulkSMS, isTwilioConfigured } = require("../services/smsService");
const { fetchRainForecast, fetchAllRainForecasts, resolveForecastZone } = require("../services/weatherForecastService");

const zoneLabel = (zone) => (zone === "ALL" ? "all registered flood zones" : zone);

const RISK_MESSAGES = {
    Critical: (zone) =>
        `FLOOD ALERT - CRITICAL: Severe flooding imminent in ${zoneLabel(zone)}. EVACUATE IMMEDIATELY. Avoid all water bodies. Call DMC: 117.`,
    High: (zone) =>
        `FLOOD WARNING - HIGH RISK: Significant flooding expected in ${zoneLabel(zone)}. Move valuables upstairs. Stay alert. DMC: 117.`,
    Moderate: (zone) =>
        `FLOOD ADVISORY - MODERATE: Elevated flood risk in ${zoneLabel(zone)}. Monitor river levels. Avoid low-lying areas. DMC: 117.`,
    Low: (zone) =>
        `FLOOD WATCH - LOW RISK: Minor flooding possible in ${zoneLabel(zone)}. Stay informed and avoid unnecessary travel near waterways.`,
};

exports.dispatchAlert = async (req, res) => {
    try {
        const { zone, riskLevel, title, customMessage } = req.body;

        if (!zone || !riskLevel) {
            return res.status(400).json({ success: false, message: "zone and riskLevel are required." });
        }

        const validLevels = ["Critical", "High", "Moderate", "Low"];
        if (!validLevels.includes(riskLevel)) {
            return res.status(400).json({ success: false, message: `riskLevel must be one of: ${validLevels.join(", ")}` });
        }

        const message = customMessage?.trim() ||
            (RISK_MESSAGES[riskLevel] ? RISK_MESSAGES[riskLevel](zone) : `Flood alert for ${zone}: ${riskLevel} risk.`);

        const alertTitle = title?.trim() || `${riskLevel} Flood Alert - ${zone}`;

        const query = { isActive: true, alertsEnabled: true, phone: { $exists: true, $ne: "" } };
        if (zone !== "ALL") query.zone = zone;

        const users = await User.find(query).select("phone name zone").lean();

        if (!users.length) {
            return res.status(200).json({
                success: true,
                message: `No active users with alerts enabled in zone "${zone}".`,
                recipientCount: 0,
                results: { sent: 0, failed: 0, simulated: 0, total: 0 },
            });
        }

        const phones = users.map((u) => u.phone);
        const sentBy = req.admin?.name || req.admin?.email || "admin";
        const meta   = { zone, riskLevel, sentBy, alertTitle };

        const results = await sendBulkSMS(phones, message, meta);

        return res.status(200).json({
            success: true,
            message: `Alert dispatched to ${results.total} users in ${zone === "ALL" ? "all zones" : `zone: ${zone}`}.`,
            alertTitle,
            zone,
            riskLevel,
            recipientCount: results.total,
            results,
            twilioActive: isTwilioConfigured(),
        });
    } catch (err) {
        console.error("[Alert] dispatchAlert error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAlertHistory = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const filter = {};

        if (req.query.zone)   filter.zone   = req.query.zone;
        if (req.query.status) filter.status = req.query.status;

        const [logs, total] = await Promise.all([
            SMSLog.find(filter).sort({ sentAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            SMSLog.countDocuments(filter),
        ]);

        res.json({ success: true, total, page, pages: Math.ceil(total / limit), logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAlertStats = async (req, res) => {
    try {
        const [total, byStatus, byZone, byRisk, recent] = await Promise.all([
            SMSLog.countDocuments(),
            SMSLog.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            SMSLog.aggregate([
                { $match: { zone: { $ne: null } } },
                { $group: { _id: "$zone", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            SMSLog.aggregate([
                { $match: { riskLevel: { $ne: null } } },
                { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
            ]),
            SMSLog.find().sort({ sentAt: -1 }).limit(5).lean(),
        ]);

        res.json({ success: true, total, byStatus, byZone, byRisk, recent });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getZones = async (req, res) => {
    try {
        const zones = await User.distinct("zone", { isActive: true });
        res.json({ success: true, zones: zones.filter(Boolean).sort() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const rainAlertMessage = (forecast) => {
    const timeText = forecast.expectedAt
        ? new Date(forecast.expectedAt).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" })
        : "the next few hours";

    const action =
        forecast.severity === "High"
            ? "Avoid low-lying roads, keep valuables safe, and prepare to move if water rises."
            : forecast.severity === "Moderate"
                ? "Monitor drains/river levels and avoid unnecessary travel near waterways."
                : "Stay aware and follow local updates.";

    return `FloodGuard Alert: ${forecast.severity} rain risk for ${forecast.zone}. ` +
        `Rain expected by ${timeText}. Chance ${forecast.probability}%, rain ${forecast.totalRainMm}mm. ` +
        `${action} Emergency: DMC 117.`;
};

exports.dispatchRainForecastAlerts = async (req, res) => {
    try {
        const hoursAhead = Number(req.body.hoursAhead || 12);
        const requestedZone = req.body.zone || "ALL";
        const forecasts = requestedZone === "ALL"
            ? await fetchAllRainForecasts(hoursAhead)
            : [await fetchRainForecast(requestedZone, hoursAhead)];

        const rainyForecasts = forecasts.filter((forecast) => forecast.rainExpected);
        if (!rainyForecasts.length) {
            return res.json({
                success: true,
                message: `No rain expected within ${hoursAhead} hours for ${requestedZone}. No SMS sent.`,
                forecasts,
                twilioActive: isTwilioConfigured(),
            });
        }

        const results = [];
        for (const forecast of rainyForecasts) {
            const zone = resolveForecastZone(forecast.zone);
            const possibleZones = [zone.name, ...zone.aliases];
            const users = await User.find({
                isActive: true,
                alertsEnabled: true,
                phone: { $exists: true, $ne: "" },
                zone: { $in: possibleZones },
            }).select("phone name zone").lean();

            const message = rainAlertMessage(forecast);
            const sendResult = await sendBulkSMS(users.map((u) => u.phone), message, {
                zone: forecast.zone,
                riskLevel: forecast.severity,
                sentBy: req.admin?.name || req.admin?.email || "rain-forecast-system",
                alertTitle: `${forecast.severity} Rain Alert - ${forecast.zone}`,
            });

            results.push({ forecast, recipientCount: users.length, sendResult });
        }

        res.json({
            success: true,
            message: "Rain forecast alert check completed.",
            results,
            twilioActive: isTwilioConfigured(),
        });
    } catch (err) {
        console.error("[Alert] dispatchRainForecastAlerts error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.testRainAlertToNumber = async (req, res) => {
    try {
        const { phone, zone = "Gampaha", hoursAhead = 12, force = false } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: "phone is required." });
        }

        const forecast = await fetchRainForecast(zone, Number(hoursAhead));
        if (!forecast.rainExpected && !force) {
            return res.json({
                success: true,
                message: `No rain expected in ${forecast.zone}; test SMS not sent. Use force=true to send anyway.`,
                forecast,
                twilioActive: isTwilioConfigured(),
            });
        }

        const message = rainAlertMessage(forecast);
        const result = await sendSMS(phone, message, {
            zone: forecast.zone,
            riskLevel: forecast.severity,
            sentBy: req.admin?.name || req.admin?.email || "admin-test",
            alertTitle: `Test Rain Alert - ${forecast.zone}`,
        });

        res.json({
            success: result.success,
            message: result.simulated
                ? "Test rain alert simulated. Configure Twilio/Dialog SMS gateway credentials for real delivery."
                : "Test rain alert sent.",
            forecast,
            result,
            twilioActive: isTwilioConfigured(),
        });
    } catch (err) {
        console.error("[Alert] testRainAlertToNumber error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
