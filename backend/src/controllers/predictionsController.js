const Prediction = require("../models/Prediction");
const User = require("../models/User");
const WeatherData = require("../models/WeatherData");
const RiverLevel = require("../models/RiverLevel");
const { sendSMS } = require("../services/smsService");
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

/**
 * GET /api/predictions/live
 * Fetches current weather + river level, saves reading, and returns LSTM prediction.
 */
exports.generateLivePrediction = async (req, res) => {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const CITY = "Gampaha";
    const LOCATION = "Dunamale"; // Key station for the LSTM model
    let currentRainfall = 0, currentHumidity = 0, currentWindSpeed = 0, currentWaterLevel = 1.5;

    // 1. Fetch Live Weather if API key is provided
    if (API_KEY) {
      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`;
        const weatherResponse = await axios.get(weatherUrl);
        const { main, wind, rain } = weatherResponse.data;
        currentRainfall = rain ? (rain['1h'] || rain['3h'] || 0) : 0;
        currentHumidity = main.humidity;
        currentWindSpeed = (wind.speed * 3.6); // convert m/s to km/h
      } catch (err) {
        console.warn("Weather API Fetch failed, using defaults:", err.message);
      }
    }

    // 2. Fetch Latest River Level from DB
    const lastRiver = await RiverLevel.findOne({ stationName: LOCATION }).sort({ recordedAt: -1 });
    if (lastRiver) currentWaterLevel = lastRiver.levelMeters;

    // 3. Save as current reading
    const newWeather = new WeatherData({
        location: LOCATION,
        rainfall: currentRainfall,
        humidity: currentHumidity,
        windSpeed: currentWindSpeed,
        recordedAt: new Date(),
        source: 'scheduled_fetch'
    });
    await newWeather.save();

    // 4. Retrieve rolling 7 days of history (Weather matched with River Levels)
    const historyWeather = await WeatherData.find({ location: LOCATION }).sort({ recordedAt: -1 }).limit(10).lean();
    
    console.log(`Live Prediction: Found ${historyWeather.length} records for ${LOCATION}`);
    // console.log("Records:", historyWeather.map(h => h.recordedAt));

    if (historyWeather.length < 7) {
      return res.status(200).json({ 
        success: false,
        status: "insufficient_data",
        message: "At least 7 days of weather and river-level readings are required for LSTM prediction.",
        availableRecords: historyWeather.length
      });
    }

    // Take exactly latest 7 and reverse for chronological order (oldest -> newest)
    const payloadData = historyWeather.slice(0, 7).reverse();

    const payload = payloadData.map(hw => ({
      date: hw.recordedAt.toISOString(),
      rainfall: hw.rainfall,
      humidity: hw.humidity,
      wind_speed: hw.windSpeed,
      water_level: hw.waterLevel || currentWaterLevel // Prefer per-day level if available
    }));

    // 5. Invoke Python LSTM
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.resolve(__dirname, '../../../ml/predict_live.py');
    
    console.log("Invoking ML Service with 7-day sequence...");
    const pyProcess = spawn(pythonPath, [scriptPath]);
    let outputData = "", errorData = "";

    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();

    pyProcess.stdout.on('data', (d) => outputData += d.toString());
    pyProcess.stderr.on('data', (d) => errorData += d.toString());

    pyProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error("Python process exited with code:", code, "Errors:", errorData);
        return res.status(500).json({ success: false, error: "ML Service Error", details: errorData });
      }

      console.log("Python output raw:", outputData);
      let result;
      try {
        result = JSON.parse(outputData);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw output:", outputData);
        return res.status(500).json({ success: false, error: "Invalid JSON from ML Service" });
      }

      // 6. Save prediction to DB
      const newPrediction = new Prediction({
        location: LOCATION,
        prediction: `LSTM prediction: ${result.prediction}`,
        riskLevel: result.prediction,
        confidence: (result.confidence || 0) * 100, // Matching schema 0-100%
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Target for tomorrow
        source: "ml_model"
      });
      await newPrediction.save();

      // 7. Trigger Alerts if needed
      if (["High", "Critical"].includes(result.prediction)) {
        const users = await User.find({ role: 'user', "notifications.sms": true });
        users.forEach(u => {
            if (u.phone) sendSMS(u.phone, `FLOOD ALERT: ${result.prediction} risk predicted for Gampaha tomorrow. Stay alert.`);
        });
      }

      res.json({ success: true, reading: newWeather, prediction: result });
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

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