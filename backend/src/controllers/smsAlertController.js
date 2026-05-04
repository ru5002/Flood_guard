/**
 * smsAlertController.js
 * Admin-only endpoints for zone-based SMS flood alert dispatch.
 */

const User    = require("../models/User");
const SMSLog  = require("../models/SMSLog");
const { sendBulkSMS, isTwilioConfigured } = require("../services/smsService");

const RISK_MESSAGES = {
    Critical: (zone) =>
        `FLOOD ALERT - CRITICAL: Severe flooding imminent in ${zone}. EVACUATE IMMEDIATELY. Avoid all water bodies. Call DMC: 117.`,
    High: (zone) =>
        `FLOOD WARNING - HIGH RISK: Significant flooding expected in ${zone}. Move valuables upstairs. Stay alert. DMC: 117.`,
    Moderate: (zone) =>
        `FLOOD ADVISORY - MODERATE: Elevated flood risk in ${zone}. Monitor river levels. Avoid low-lying areas. DMC: 117.`,
    Low: (zone) =>
        `FLOOD WATCH - LOW RISK: Minor flooding possible in ${zone}. Stay informed and avoid unnecessary travel near waterways.`,
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
