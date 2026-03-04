const mongoose = require('mongoose');

/**
 * RiverLevel Model
 * Ingested from: Irrigation Dept / DMC gauges (future), CSV upload, or manual entry.
 * Critical input for flood risk calculation.
 */
const riverLevelSchema = new mongoose.Schema({
    stationName: {
        type: String,
        required: true,
        trim: true
    },
    riverName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        default: 'Gampaha',
        trim: true
    },
    levelMeters: {
        type: Number,       // current water level in metres
        required: true
    },
    normalLevelMeters: {
        type: Number,       // baseline / safe level
        default: null
    },
    alertLevelMeters: {
        type: Number,       // triggers yellow alert
        default: null
    },
    criticalLevelMeters: {
        type: Number,       // triggers red alert
        default: null
    },
    status: {
        type: String,
        enum: ['Normal', 'Alert', 'Critical', 'Unknown'],
        default: 'Unknown'
    },
    source: {
        type: String,
        enum: ['irrigation_dept', 'dmc_api', 'csv_import', 'manual_entry', 'scheduled_fetch'],
        default: 'manual_entry'
    },
    recordedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    importBatchId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

riverLevelSchema.index({ stationName: 1, recordedAt: -1 });
riverLevelSchema.index({ riverName: 1, recordedAt: -1 });

module.exports = mongoose.model('RiverLevel', riverLevelSchema);
