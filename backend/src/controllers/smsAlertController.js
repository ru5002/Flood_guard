/**
 * smsAlertController.js
 * Admin-only endpoints for zone-based SMS flood alert dispatch.
 */

const User      = require("../models/User");
const SMSLog    = require("../models/SMSLog");
const EmailLog  = require("../models/EmailLog");
const { sendSMS, sendBulkSMS, isTwilioConfigured } = require("../services/smsService");
const { sendEmail, isEmailConfigured } = require("../services/emailService");
const { fetchRainForecast, fetchAllRainForecasts, resolveForecastZone } = require("../services/weatherForecastService");

const logEmail = async (email, subject, result, { zone, riskLevel, sentBy, alertTitle }) => {
    const status = result.simulated ? "SIMULATED" : result.success ? "SENT" : "FAILED";
    try {
        await EmailLog.create({ email, subject, status, zone, riskLevel, sentBy, alertTitle });
    } catch (e) {
        console.error("[EmailLog] write failed:", e.message);
    }
};

const buildEmailHtml = (riskLevel, zone, message, title) => {
    const colors = { Critical: '#dc2626', High: '#ea580c', Moderate: '#d97706', Low: '#2563eb' };
    const color = colors[riskLevel] || '#374151';
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <div style="background:#0a0a0a;padding:16px 24px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.3rem;font-weight:800;color:#fff;letter-spacing:-0.03em;">FloodGuard</span>
        <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Gampaha District Alert</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <div style="display:inline-block;background:${color};color:#fff;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding:4px 14px;border-radius:999px;margin-bottom:16px;">
          ${riskLevel} Risk
        </div>
        <h2 style="font-size:1.25rem;font-weight:700;color:#111;margin:0 0 12px;">${title}</h2>
        <p style="font-size:0.95rem;color:#374151;line-height:1.6;margin:0 0 20px;">${message}</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:14px 18px;font-size:0.85rem;color:#6b7280;">
          <strong style="color:#111;">Emergency Contacts:</strong><br/>
          Disaster Management Centre: <strong>117</strong> &nbsp;|&nbsp;
          Police: <strong>119</strong> &nbsp;|&nbsp;
          Ambulance: <strong>1990</strong>
        </div>
        <a href="http://localhost:5173/predictions" style="display:inline-block;margin-top:20px;background:#0a0a0a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem;">
          View Live Predictions →
        </a>
        <p style="font-size:0.75rem;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
          This alert was sent by FloodGuard for ${zone}. You received this because you registered for flood alerts.
        </p>
      </div>
    </div>`;
};

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

        const users = await User.find(query).select("phone email name zone").lean();

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

        // Send SMS
        const smsResults = await sendBulkSMS(phones, message, meta);

        // Send Email to all users who have an email address
        const emailHtml = buildEmailHtml(riskLevel, zone, message, alertTitle);
        const emailResults = { sent: 0, failed: 0, total: 0 };
        const emailMeta = { zone, riskLevel, sentBy, alertTitle };
        for (const user of users) {
            if (!user.email) continue;
            emailResults.total++;
            const subject = `FloodGuard ${riskLevel} Alert — ${zone}`;
            const result = await sendEmail({ to: user.email, subject, html: emailHtml, text: message });
            await logEmail(user.email, subject, result, emailMeta);
            if (result.success) emailResults.sent++;
            else emailResults.failed++;
        }

        return res.status(200).json({
            success: true,
            message: `Alert dispatched to ${smsResults.total} users in ${zone === "ALL" ? "all zones" : `zone: ${zone}`}.`,
            alertTitle,
            zone,
            riskLevel,
            recipientCount: smsResults.total,
            results: smsResults,
            emailResults,
            twilioActive: isTwilioConfigured(),
            emailActive: isEmailConfigured(),
        });
    } catch (err) {
        console.error("[Alert] dispatchAlert error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendDemoAlert = async (req, res) => {
    try {
        const { phone, email: demoEmail, zone = "Gampaha", riskLevel = "High", title, customMessage } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, message: "phone is required." });
        }

        const validLevels = ["Critical", "High", "Moderate", "Low"];
        if (!validLevels.includes(riskLevel)) {
            return res.status(400).json({ success: false, message: `riskLevel must be one of: ${validLevels.join(", ")}` });
        }

        const message = customMessage?.trim() ||
            (RISK_MESSAGES[riskLevel] ? RISK_MESSAGES[riskLevel](zone) : `Flood alert for ${zone}: ${riskLevel} risk.`);
        const alertTitle = title?.trim() || `${riskLevel} Flood Alert - ${zone}`;

        // SMS
        const smsResult = await sendSMS(phone, message, {
            zone, riskLevel,
            sentBy: req.admin?.name || req.admin?.email || "admin",
            alertTitle,
        });

        // Email (to test email if provided, else skip)
        let emailResult = null;
        if (demoEmail) {
            const emailHtml = buildEmailHtml(riskLevel, zone, message, alertTitle);
            const subject = `FloodGuard ${riskLevel} Alert — ${zone}`;
            emailResult = await sendEmail({ to: demoEmail, subject, html: emailHtml, text: message });
            await logEmail(demoEmail, subject, emailResult, { zone, riskLevel, sentBy: req.admin?.name || req.admin?.email || "admin", alertTitle });
        }

        return res.status(200).json({
            success: smsResult.success,
            message: smsResult.simulated ? "SMS simulated. Add Twilio credentials for real delivery." : "SMS sent to the selected number.",
            alertTitle,
            zone,
            riskLevel,
            result: smsResult,
            results: {
                sent: smsResult.success && !smsResult.simulated ? 1 : 0,
                simulated: smsResult.simulated ? 1 : 0,
                failed: smsResult.success ? 0 : 1,
                total: 1,
            },
            emailResult,
            twilioActive: isTwilioConfigured(),
            emailActive: isEmailConfigured(),
        });
    } catch (err) {
        console.error("[Alert] sendDemoAlert error:", err.message);
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
        const [
            total, byStatus, byZone, byRisk, recent,
            emailTotal, emailByStatus, emailByZone, emailByRisk, emailRecent,
        ] = await Promise.all([
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

            EmailLog.countDocuments(),
            EmailLog.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            EmailLog.aggregate([
                { $match: { zone: { $ne: null } } },
                { $group: { _id: "$zone", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            EmailLog.aggregate([
                { $match: { riskLevel: { $ne: null } } },
                { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
            ]),
            EmailLog.find().sort({ sentAt: -1 }).limit(5).lean(),
        ]);

        res.json({
            success: true,
            total, byStatus, byZone, byRisk, recent,
            email: { total: emailTotal, byStatus: emailByStatus, byZone: emailByZone, byRisk: emailByRisk, recent: emailRecent },
        });
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

// Email-only dispatch to all users in a zone
exports.dispatchEmailAlert = async (req, res) => {
    try {
        const { zone, riskLevel = "High", title, customMessage } = req.body;
        if (!zone || !riskLevel) return res.status(400).json({ success: false, message: "zone and riskLevel are required." });

        const message = customMessage?.trim() || (RISK_MESSAGES[riskLevel]?.(zone) ?? `Flood alert for ${zone}: ${riskLevel} risk.`);
        const alertTitle = title?.trim() || `${riskLevel} Flood Alert - ${zone}`;

        const query = { isActive: true, alertsEnabled: true, email: { $exists: true, $ne: "" } };
        if (zone !== "ALL") query.zone = zone;
        const users = await User.find(query).select("email name zone").lean();

        if (!users.length) {
            return res.json({ success: true, message: `No users with email found in zone "${zone}".`, emailResults: { sent: 0, failed: 0, total: 0 } });
        }

        const html = buildEmailHtml(riskLevel, zone, message, alertTitle);
        const emailResults = { sent: 0, failed: 0, total: users.length };
        const sentBy = req.admin?.name || req.admin?.email || "admin";
        const emailMeta = { zone, riskLevel, sentBy, alertTitle };
        for (const user of users) {
            const subject = `FloodGuard ${riskLevel} Alert — ${zone}`;
            const r = await sendEmail({ to: user.email, subject, html, text: message });
            await logEmail(user.email, subject, r, emailMeta);
            if (r.success) emailResults.sent++; else emailResults.failed++;
        }

        res.json({ success: true, message: `Email alert sent to ${emailResults.sent}/${emailResults.total} users in ${zone}.`, alertTitle, zone, riskLevel, emailResults, emailActive: isEmailConfigured() });
    } catch (err) {
        console.error("[Alert] dispatchEmailAlert error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Email-only demo to a single address
exports.sendDemoEmailAlert = async (req, res) => {
    try {
        const { email, zone = "Gampaha", riskLevel = "High", title, customMessage } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "email is required." });

        const message = customMessage?.trim() || (RISK_MESSAGES[riskLevel]?.(zone) ?? `Flood alert for ${zone}: ${riskLevel} risk.`);
        const alertTitle = title?.trim() || `${riskLevel} Flood Alert - ${zone}`;
        const html = buildEmailHtml(riskLevel, zone, message, alertTitle);
        const subject = `FloodGuard ${riskLevel} Alert — ${zone}`;

        const result = await sendEmail({ to: email, subject, html, text: message });
        await logEmail(email, subject, result, { zone, riskLevel, sentBy: req.admin?.name || req.admin?.email || "admin", alertTitle });

        res.json({
            success: result.success,
            message: result.success ? `Email sent to ${email}.` : `Email failed: ${result.message}`,
            alertTitle, zone, riskLevel,
            emailResults: { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1, total: 1 },
            emailActive: isEmailConfigured(),
        });
    } catch (err) {
        console.error("[Alert] sendDemoEmailAlert error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
