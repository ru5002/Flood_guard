const Prediction = require("../models/Prediction");
const WeatherData = require("../models/WeatherData");
const RiverLevel = require("../models/RiverLevel");
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const {
  fetchDunamaleIrrigationSnapshot,
  buildGampahaZonePredictions,
} = require('../services/irrigationDataService');
const { sendAutomaticRiskAlerts } = require('../services/automaticAlertService');

const projectRoot = path.resolve(__dirname, '../../..');
const localPython = process.platform === 'win32'
  ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
  : path.join(projectRoot, '.venv', 'bin', 'python');

const getPythonPath = () => process.env.PYTHON_PATH || (fs.existsSync(localPython) ? localPython : (process.platform === 'win32' ? 'python' : 'python3'));

const riskRank = { None: 0, Low: 1, Moderate: 2, High: 3, Critical: 4 };

const highestRisk = (...risks) => risks
  .filter(Boolean)
  .sort((a, b) => (riskRank[b] || 0) - (riskRank[a] || 0))[0] || 'None';

const loadDatasetFallback = () => {
  const datasetPath = path.join(projectRoot, 'ml', 'data', 'processed', 'cleaned_dataset.csv');
  if (!fs.existsSync(datasetPath)) return [];

  const lines = fs.readFileSync(datasetPath, 'utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  const dateIndex = headers.indexOf('date');
  const levelIndex = headers.indexOf('water_level');
  const rainfallIndex = headers.indexOf('rainfall_mm_day');

  return lines.slice(1).slice(-14).map((line) => {
    const columns = line.split(',');
    return {
      date: columns[dateIndex],
      water_level: Number(columns[levelIndex]),
      rainfall: rainfallIndex >= 0 ? Number(columns[rainfallIndex]) : 0,
      source: 'training_dataset_fallback'
    };
  });
};

const isDatabaseReady = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

const fallbackPredictionDocs = () => {
  const records = loadDatasetFallback();
  const latest = records[records.length - 1] || { water_level: 0.7, date: new Date().toISOString() };
  const level = latest.water_level || 0;
  let riskLevel = 'None';

  if (level >= 2.5) riskLevel = 'Critical';
  else if (level >= 2.0) riskLevel = 'High';
  else if (level >= 1.5) riskLevel = 'Moderate';
  else if (level >= 1.0) riskLevel = 'Low';

  return [{
    _id: 'dataset-dunamale',
    location: 'Gampaha',
    district: 'Gampaha',
    prediction: `Dataset-backed river level analysis: ${riskLevel} risk at Dunamale`,
    riskLevel,
    riverRisk: riskLevel,
    waterLevel: level,
    rainfallMm: latest.rainfall || 0,
    floodProbability: riskLevel === 'None' ? 0.05 : 0.45,
    confidence: 85,
    modelVersion: 'rf-aththanagalu-v1',
    source: 'ml_model',
    generatedAt: new Date(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }];
};

/**
 * GET /api/predictions/live
 * Fetches current weather + river level, saves reading, and returns ML prediction.
 */
exports.generateLivePrediction = async (req, res) => {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const CITY = "Gampaha";
    const LOCATION = "Dunamale"; // Key station for the Random Forest model
    let currentRainfall = 0, currentHumidity = 0, currentWindSpeed = 0, currentWaterLevel = 1.5;
    let currentTemperature = 28.0;
    let isLiveWeather = false;
    let isLiveIrrigation = false;
    let irrigationSnapshot = null;

    console.log("-> /api/predictions/live requested");

    // 1. Prefer official Irrigation Department gauge/rainfall data for Dunamale.
    try {
      irrigationSnapshot = await fetchDunamaleIrrigationSnapshot();
      if (Number.isFinite(irrigationSnapshot.waterLevelM)) {
        currentWaterLevel = irrigationSnapshot.waterLevelM;
      }
      if (Number.isFinite(irrigationSnapshot.rainfallMm)) {
        currentRainfall = irrigationSnapshot.rainfallMm;
      }
      isLiveIrrigation = true;
      console.log("Irrigation Department ArcGIS fetch successful:", irrigationSnapshot);
    } catch (err) {
      console.warn("Irrigation Department ArcGIS fetch failed, falling back:", err.message);
    }

    // 2. Fetch Live Weather if API key is provided. It fills weather context, but
    // official gauge rainfall stays preferred when available.
    if (API_KEY) {
      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`;
        const weatherResponse = await axios.get(weatherUrl);
        const { main, wind, rain } = weatherResponse.data;
        if (!isLiveIrrigation) {
          currentRainfall = rain ? (rain['1h'] || rain['3h'] || 0) : 0;
        }
        currentHumidity = main.humidity;
        currentWindSpeed = (wind.speed * 3.6); // convert m/s to km/h
        currentTemperature = main.temp;
        isLiveWeather = true;
        console.log("Weather API Fetch successful:", { currentRainfall, currentHumidity, currentWindSpeed });
      } catch (err) {
        console.warn("Weather API Fetch failed, using defaults:", err.message);
      }
    } else {
      console.warn("No OPENWEATHER_API_KEY provided. Using historical dataset values.");
    }

    // 3. Fetch latest stored river level only if the live official gauge is unavailable.
    if (!isLiveIrrigation && isDatabaseReady()) {
      const lastRiver = await RiverLevel.findOne({ stationName: LOCATION }).sort({ recordedAt: -1 });
      if (lastRiver) currentWaterLevel = lastRiver.levelMeters;
    }

    let payloadData = [];

    if (isLiveWeather || isLiveIrrigation) {
      // 4. Save as current reading only if we actually fetched live data.
      const newWeather = new WeatherData({
          location: LOCATION,
          rainfall: currentRainfall,
          humidity: currentHumidity,
          windSpeed: currentWindSpeed,
          temperature: currentTemperature,
          waterLevel: currentWaterLevel,
          recordedAt: new Date(),
          source: isLiveIrrigation ? 'irrigation_department_arcgis' : 'scheduled_fetch'
      });
      if (isDatabaseReady()) {
        await newWeather.save();
      }
      
      if (isDatabaseReady()) {
        const historyWeather = await WeatherData.find({ location: LOCATION }).sort({ recordedAt: -1 }).limit(14).lean();
        payloadData = historyWeather.reverse();
      }

      if (payloadData.length < 14) {
        payloadData = loadDatasetFallback();
      }
    } else {
      // Use latest 7 values from dataset to avoid cluttering DB with fake zero values
      const historyWeather = isDatabaseReady()
        ? await WeatherData.find({ location: LOCATION }).sort({ recordedAt: -1 }).limit(14).lean()
        : [];
      
      if (historyWeather.length < 14) {
        payloadData = loadDatasetFallback();
      } else {
        payloadData = historyWeather.reverse();
      }
    }

    if (payloadData.length > 0 && (isLiveWeather || isLiveIrrigation)) {
      payloadData[payloadData.length - 1] = {
        ...payloadData[payloadData.length - 1],
        date: new Date().toISOString(),
        rainfall: currentRainfall,
        humidity: currentHumidity || payloadData[payloadData.length - 1].humidity,
        temperature: currentTemperature || payloadData[payloadData.length - 1].temperature,
        windSpeed: currentWindSpeed || payloadData[payloadData.length - 1].windSpeed,
        waterLevel: currentWaterLevel,
        water_level: currentWaterLevel,
        source: isLiveIrrigation ? 'irrigation_department_arcgis' : 'live_weather'
      };
    }

    console.log(`Live Prediction: Using ${payloadData.length} records for ${LOCATION}`);

    const payload = payloadData.map(hw => ({
      date: hw.date || hw.recordedAt?.toISOString(),
      rainfall: hw.rainfall,
      humidity: hw.humidity,
      temperature: hw.temperature || 28.0, // Added temperature
      wind_speed: hw.windSpeed,
      water_level: hw.water_level || hw.waterLevel || currentWaterLevel
    }));

    // 5. Invoke Python ML model
    const pythonPath = getPythonPath();
    const scriptPath = path.resolve(__dirname, '../../../ml/predict_rf.py');
    
    console.log("Invoking ML Service with 14-day sequence...");
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
      const immediateRisk = highestRisk(irrigationSnapshot?.officialRisk, result.day1.riskLevel);
      const newPrediction = new Prediction({
        location: LOCATION,
        prediction: `Official gauge + Random Forest: ${immediateRisk} now, ${result.day1.riskLevel} tomorrow, ${result.day2.riskLevel} day 2`,
        riskLevel: immediateRisk,
        riverRisk: irrigationSnapshot?.officialRisk || result.day1.riskLevel,
        waterLevel: currentWaterLevel,
        rainfallMm: currentRainfall,
        floodProbability: result.day1.probabilities?.[result.day1.riskLevel] || 0,
        confidence: 85, // Dummy confidence for now
        modelVersion: result.modelVersion || 'rf-aththanagalu-climate-v3',
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // Target for next 2 days
        source: "ml_model",
        // Storing complex json in details (you might need to update Schema if you want rigid types)
        details: result 
      });
      if (isDatabaseReady()) {
        await newPrediction.save();
      }

      res.json({ 
        success: true, 
        reading: isLiveWeather ? payloadData[payloadData.length - 1] : payloadData[payloadData.length - 1], 
        prediction: {
          ...result,
          current: {
            riskLevel: immediateRisk,
            officialRisk: irrigationSnapshot?.officialRisk,
            waterLevel: currentWaterLevel,
            rainfall: currentRainfall,
          }
        },
        isLiveWeather,
        isLiveIrrigation,
        irrigationSnapshot,
        automaticAlerts,
        generatedAt: new Date()
      });
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
    if (!isDatabaseReady()) {
      const predictions = fallbackPredictionDocs();
      return res.json({
        success: true,
        count: predictions.length,
        generatedAt: predictions[0].generatedAt,
        modelVersion: 'rf-aththanagalu-v1',
        predictions,
        databaseFallback: true,
      });
    }

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
    if (!isDatabaseReady()) {
      const predictions = fallbackPredictionDocs();
      const riskOrder = ["Critical", "High", "Moderate", "Low", "None"];
      return res.json({
        success: true,
        summary: riskOrder.map((level) => ({
          riskLevel: level,
          count: predictions.filter((prediction) => prediction.riskLevel === level).length,
          locations: predictions.filter((prediction) => prediction.riskLevel === level).map((prediction) => prediction.location),
        })),
        databaseFallback: true,
      });
    }

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
 * Also triggers automatic SMS for Moderate/High/Critical risk locations.
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
    const automaticAlerts = await sendAutomaticRiskAlerts(docs, { source: 'admin-prediction-create' });
    const smsSentCount = automaticAlerts.results.reduce((total, item) => {
      if (!item.results) return total;
      return total + item.results.sent + item.results.simulated;
    }, 0);
    const alertLocations = automaticAlerts.results
      .filter((item) => item.sent)
      .map((item) => item.zone);

    res.status(201).json({
      success: true,
      count: inserted.length,
      smsSentCount,
      alertLocations,
      automaticAlerts,
      message: "Predictions saved and alerts processed",
    });
  } catch (err) {
    console.error("createPredictions error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * GET /api/predictions/official-zones
 * Returns Gampaha-area zone cards mapped to the latest official river-gauge data.
 */
exports.getOfficialZonePredictions = async (req, res) => {
  try {
    const predictions = await buildGampahaZonePredictions();
    res.json({
      success: true,
      source: 'Irrigation Department ArcGIS',
      sourceUrl: 'https://slirrigation.maps.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38',
      count: predictions.length,
      generatedAt: new Date(),
      predictions,
    });
  } catch (err) {
    console.error('getOfficialZonePredictions error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Official zone data unavailable',
      error: err.message,
    });
  }
};
