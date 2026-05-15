/**
 * seedPredictions.js
 * Seeds ONLY 4 Attanagalu Oya focus locations:
 * Minuwangoda, Gampaha, Ja-Ela, Negombo
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Prediction = require("../models/Prediction");

const DUMMY_PREDICTIONS = [
  {
    location: "Minuwangoda",
    district: "Gampaha",
    prediction: "Thunderstorms",
    riskLevel: "High",
    rainfallMm: 50,
    riverRisk: "High",
    floodProbability: 80,
    confidence: 76,
  },
  {
    location: "Gampaha",
    district: "Gampaha",
    prediction: "Heavy Rain Expected",
    riskLevel: "High",
    rainfallMm: 45,
    riverRisk: "Moderate",
    floodProbability: 72,
    confidence: 80,
  },
  {
    location: "Ja-Ela",
    district: "Gampaha",
    prediction: "Overcast with Moderate Rain",
    riskLevel: "Moderate",
    rainfallMm: 25,
    riverRisk: "Low",
    floodProbability: 40,
    confidence: 78,
  },
  {
    location: "Negombo",
    district: "Gampaha",
    prediction: "Light Showers",
    riskLevel: "Low",
    rainfallMm: 12,
    riverRisk: "None",
    floodProbability: 18,
    confidence: 85,
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected...");

    // Clear previous predictions
    await Prediction.deleteMany({});
    console.log("🗑 Old predictions cleared");

    const now = new Date();

    const docs = DUMMY_PREDICTIONS.map((p) => ({
      ...p,
      modelVersion: "v1.0-attanagalu-baseline",
      source: "simulated",
      generatedAt: now,
      validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    }));

    await Prediction.insertMany(docs);

    console.log("─────────────────────────────────────────");
    console.log(`✅  Seeded ${docs.length} Attanagalu Oya predictions`);
    console.log("─────────────────────────────────────────");
    docs.forEach((d) => console.log(`   [${d.riskLevel.padEnd(8)}] ${d.location} – ${d.prediction}`));
    console.log("─────────────────────────────────────────");
    console.log("API endpoint: GET /api/predictions/latest");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
})();