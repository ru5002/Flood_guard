const mongoose = require('mongoose');

/**
 * WeatherData Model
 * Ingested from: OpenWeather API (scheduled), CSV upload, or manual entry.
 * Feeds into the ML prediction pipeline.
 */
const weatherDataSchema = new mongoose.Schema({
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
    temperature: {
        type: Number,       // °C
        default: null
    },
    humidity: {
        type: Number,       // %
        default: null
    },
    pressure: {
        type: Number,       // hPa
        default: null
    },
    windSpeed: {
        type: Number,       // km/h
        default: null
    },
    windDirection: {
        type: String,
        default: null
    },
    rainfall: {
        type: Number,       // mm
        default: 0
    },
    waterLevel: {
        type: Number,       // metres at related river station, when captured with weather
        default: null
    },
    condition: {
        type: String,       // e.g. "Heavy Rain", "Clear Sky"
        default: 'Unknown'
    },
    source: {
        type: String,
        enum: ['openweather_api', 'csv_import', 'manual_entry', 'scheduled_fetch'],
        default: 'manual_entry'
    },
    recordedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    importBatchId: {
        type: String,       // groups rows from same CSV upload
        default: null
    }
}, {
    timestamps: true
});

weatherDataSchema.index({ location: 1, recordedAt: -1 });
weatherDataSchema.index({ importBatchId: 1 });

module.exports = mongoose.model('WeatherData', weatherDataSchema);
