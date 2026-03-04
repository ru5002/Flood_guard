const Prediction = require("../models/Prediction");
const User = require("../models/User");
const { sendSMS } = require("../services/smsService");

/**
 * GET /api/predictions/latest
 */
exports.getLatestPredictions = async (req, res) => {
  try {
    const latest = await Prediction.aggregate([
      { $sort: { generatedAt: -1 } },
      { $group: { _id: "$location", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { riskLevel: -1, location: 1 } },
    ]);

    res.json({
      success: true,
      count: latest.length,
      generatedAt: latest[0]?.generatedAt || new Date(),
      modelVersion: latest[0]?.modelVersion || "v0.1-placeholder",
      predictions: latest,
    });
  } catch (err) {
    console.error("getLatestPredictions error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * GET /api/predictions/history/:location
 */
exports.getPredictionHistory = async (req, res) => {
  try {
    const { location } = req.params;
    const limit = parseInt(req.query.limit) || 30;

    const history = await Prediction.find({ location }).sort({ generatedAt: -1 }).limit(limit).lean();

    if (!history.length) {
      return res.status(404).json({ success: false, message: "No predictions found for this location" });
    }

    res.json({ success: true, count: history.length, location, predictions: history });
  } catch (err) {
    console.error("getPredictionHistory error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * GET /api/predictions/summary
 */
exports.getPredictionSummary = async (req, res) => {
  try {
    const summary = await Prediction.aggregate([
      { $sort: { generatedAt: -1 } },
      { $group: { _id: "$location", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $group: { _id: "$riskLevel", count: { $sum: 1 }, locations: { $push: "$location" } } },
    ]);

    const riskOrder = ["Critical", "High", "Moderate", "Low", "None"];
    const ordered = riskOrder.map((level) => {
      const found = summary.find((s) => s._id === level);
      return { riskLevel: level, count: found?.count || 0, locations: found?.locations || [] };
    });

    res.json({ success: true, summary: ordered });
  } catch (err) {
    console.error("getPredictionSummary error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * POST /api/predictions (admin only)
 * Creates predictions in bulk.
 * NEW: triggers simulated SMS for High/Critical risk locations.
 */
exports.createPredictions = async (req, res) => {
  try {
    const { predictions } = req.body;

    if (!Array.isArray(predictions) || !predictions.length) {
      return res.status(400).json({ success: false, message: "`predictions` array is required" });
    }

    const docs = predictions.map((p) => ({
      ...p,
      generatedAt: p.generatedAt || new Date(),
      validUntil: p.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000),
      source: p.source || "ml_model",
    }));

    const inserted = await Prediction.insertMany(docs, { ordered: false });

    // --- NEW: SMS trigger logic ---
    // Send alerts only for High/Critical predictions
    const alertLevels = new Set(["High", "Critical"]);

    // unique locations that need alerting
    const alertLocations = [...new Set(docs.filter((d) => alertLevels.has(d.riskLevel)).map((d) => d.location))];

    let smsSentCount = 0;

    // If your user schema has zone field (you do), send only to users in that zone/location
    for (const loc of alertLocations) {
      const users = await User.find({
        alertsEnabled: true,
        isActive: true,
        zone: loc, // zone should match location string (e.g., "Gampaha")
        phone: { $exists: true, $ne: "" },
      }).lean();

      const msg = `⚠ Flood risk ${docs.find((d) => d.location === loc)?.riskLevel?.toUpperCase()} in ${loc}. Please stay alert and follow safety guidance.`;

      for (const u of users) {
        await sendSMS(u.phone, msg);
        smsSentCount++;
      }
    }

    res.status(201).json({
      success: true,
      count: inserted.length,
      smsSentCount,
      alertLocations,
      message: "Predictions saved and alerts processed",
    });
  } catch (err) {
    console.error("createPredictions error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};