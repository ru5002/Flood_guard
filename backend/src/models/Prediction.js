const mongoose = require('mongoose');

/**
 * Prediction Model
 * Stores flood/weather predictions per location.
 * Initially populated by the seed script (placeholder).
 * Later to be replaced by real ML model output.
 */
const predictionSchema = new mongoose.Schema({
    location: {
        type: String,
        required: true,
        trim: true
    },
    district: {
        type: String,
        default: 'Gampaha',
        trim: true
    },
    prediction: {
        type: String,
        required: true,
        trim: true
    },
    riskLevel: {
        type: String,
        enum: ['None', 'Low', 'Moderate', 'High', 'Critical'],
        default: 'None'
    },
    rainfallMm: {
        type: Number,
        default: 0
    },
    riverRisk: {
        type: String,
        enum: ['None', 'Low', 'Moderate', 'High', 'Critical'],
        default: 'None'
    },
    floodProbability: {
        type: Number,          // 0–100 %
        min: 0,
        max: 100,
        default: 0
    },
    confidence: {
        type: Number,          // 0–100 %
        min: 0,
        max: 100,
        default: 75
    },
    modelVersion: {
        type: String,
        default: 'v0.1-placeholder'  // bumped when real ML is wired
    },
    source: {
        type: String,
        enum: ['manual', 'ml_model', 'csv_import', 'scheduled_fetch'],
        default: 'manual'
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)  // +24 h
    }
}, {
    timestamps: true
});

// Index to quickly fetch latest predictions per location
predictionSchema.index({ location: 1, generatedAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
