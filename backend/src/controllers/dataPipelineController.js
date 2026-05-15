const WeatherData = require('../models/WeatherData');
const RiverLevel  = require('../models/RiverLevel');
const crypto      = require('crypto');

/* ─── Tiny inline CSV parser ────────────────────────────────────────────────
   Avoids adding an extra npm dependency.
   Handles quoted fields and trims whitespace.
──────────────────────────────────────────────────────────────────────────── */
function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

    return lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row  = {};
        headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
        return row;
    });
}

/* ─── Weather Data ─────────────────────────────────────────────────────────── */

/**
 * POST /api/pipeline/weather/upload
 * Accepts a CSV with columns:
 *   location, district, temperature, humidity, pressure,
 *   wind_speed, wind_direction, rainfall, condition, recorded_at
 */
exports.uploadWeatherCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No CSV file uploaded. Use field name "file".' });
        }

        const text      = req.file.buffer.toString('utf8');
        const rows      = parseCSV(text);
        const batchId   = crypto.randomUUID();

        const docs = rows.map(r => ({
            location:      r.location      || 'Unknown',
            district:      r.district      || 'Gampaha',
            temperature:   parseFloat(r.temperature)   || null,
            humidity:      parseFloat(r.humidity)      || null,
            pressure:      parseFloat(r.pressure)      || null,
            windSpeed:     parseFloat(r.wind_speed)    || null,
            windDirection: r.wind_direction            || null,
            rainfall:      parseFloat(r.rainfall)      || 0,
            condition:     r.condition                 || 'Unknown',
            source:        'csv_import',
            recordedAt:    r.recorded_at ? new Date(r.recorded_at) : new Date(),
            importBatchId: batchId
        }));

        if (!docs.length) {
            return res.status(400).json({ success: false, message: 'CSV contained no data rows.' });
        }

        const inserted = await WeatherData.insertMany(docs, { ordered: false });
        res.status(201).json({
            success: true,
            batchId,
            count: inserted.length,
            message: `${inserted.length} weather records imported`
        });
    } catch (err) {
        console.error('uploadWeatherCSV error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/**
 * POST /api/pipeline/weather/manual
 * Body: single weather record (JSON).
 */
exports.addWeatherManual = async (req, res) => {
    try {
        const record = new WeatherData({ ...req.body, source: 'manual_entry' });
        await record.save();
        res.status(201).json({ success: true, message: 'Weather record saved', data: record });
    } catch (err) {
        console.error('addWeatherManual error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/**
 * GET /api/pipeline/weather
 * Returns recent weather records (queryable by location).
 */
exports.getWeatherData = async (req, res) => {
    try {
        const filter = {};
        if (req.query.location) filter.location = { $regex: req.query.location, $options: 'i' };
        if (req.query.source)   filter.source   = req.query.source;

        const limit = parseInt(req.query.limit) || 100;
        const data  = await WeatherData.find(filter).sort({ recordedAt: -1 }).limit(limit).lean();
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error('getWeatherData error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/* ─── River Level Data ─────────────────────────────────────────────────────── */

/**
 * POST /api/pipeline/river/upload
 * Accepts a CSV with columns:
 *   station_name, river_name, location, district,
 *   level_meters, normal_level_meters, alert_level_meters,
 *   critical_level_meters, recorded_at
 */
exports.uploadRiverCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No CSV file uploaded. Use field name "file".' });
        }

        const text    = req.file.buffer.toString('utf8');
        const rows    = parseCSV(text);
        const batchId = crypto.randomUUID();

        const docs = rows.map(r => {
            const level    = parseFloat(r.level_meters)          || 0;
            const normal   = parseFloat(r.normal_level_meters)   || null;
            const alert    = parseFloat(r.alert_level_meters)    || null;
            const critical = parseFloat(r.critical_level_meters) || null;

            // Auto-compute status
            let status = 'Normal';
            if (critical && level >= critical) status = 'Critical';
            else if (alert && level >= alert)  status = 'Alert';

            return {
                stationName:          r.station_name   || 'Unknown',
                riverName:            r.river_name     || 'Unknown',
                location:             r.location       || '',
                district:             r.district       || 'Gampaha',
                levelMeters:          level,
                normalLevelMeters:    normal,
                alertLevelMeters:     alert,
                criticalLevelMeters:  critical,
                status,
                source:               'csv_import',
                recordedAt:           r.recorded_at ? new Date(r.recorded_at) : new Date(),
                importBatchId:        batchId
            };
        });

        if (!docs.length) {
            return res.status(400).json({ success: false, message: 'CSV contained no data rows.' });
        }

        const inserted = await RiverLevel.insertMany(docs, { ordered: false });
        res.status(201).json({
            success: true,
            batchId,
            count: inserted.length,
            message: `${inserted.length} river level records imported`
        });
    } catch (err) {
        console.error('uploadRiverCSV error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/**
 * POST /api/pipeline/river/manual
 * Body: single river-level record (JSON).
 */
exports.addRiverManual = async (req, res) => {
    try {
        const body = req.body;
        // Auto-compute status if thresholds provided
        const level    = parseFloat(body.levelMeters)         || 0;
        const alert    = parseFloat(body.alertLevelMeters)    || null;
        const critical = parseFloat(body.criticalLevelMeters) || null;

        let status = 'Normal';
        if (critical && level >= critical) status = 'Critical';
        else if (alert && level >= alert)  status = 'Alert';

        const record = new RiverLevel({ ...body, status, source: 'manual_entry' });
        await record.save();
        res.status(201).json({ success: true, message: 'River level record saved', data: record });
    } catch (err) {
        console.error('addRiverManual error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/**
 * GET /api/pipeline/river
 * Returns recent river-level records.
 */
exports.getRiverData = async (req, res) => {
    try {
        const filter = {};
        if (req.query.river)  filter.riverName   = { $regex: req.query.river,  $options: 'i' };
        if (req.query.status) filter.status       = req.query.status;

        const limit = parseInt(req.query.limit) || 100;
        const data  = await RiverLevel.find(filter).sort({ recordedAt: -1 }).limit(limit).lean();
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error('getRiverData error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

/**
 * GET /api/pipeline/status
 * High-level data-ingestion summary: record counts + latest timestamps.
 * Useful for admin dashboards to verify data freshness.
 */
exports.getPipelineStatus = async (req, res) => {
    try {
        const [weatherCount, riverCount, latestWeather, latestRiver] = await Promise.all([
            WeatherData.countDocuments(),
            RiverLevel.countDocuments(),
            WeatherData.findOne().sort({ recordedAt: -1 }).select('location recordedAt source').lean(),
            RiverLevel.findOne().sort({ recordedAt:  -1 }).select('stationName riverName recordedAt source').lean()
        ]);

        res.json({
            success: true,
            pipeline: {
                weatherData: {
                    totalRecords: weatherCount,
                    latestRecord: latestWeather || null,
                    supportedSources: ['openweather_api', 'csv_import', 'manual_entry', 'scheduled_fetch']
                },
                riverLevels: {
                    totalRecords: riverCount,
                    latestRecord: latestRiver || null,
                    supportedSources: ['irrigation_dept', 'dmc_api', 'csv_import', 'manual_entry', 'scheduled_fetch']
                },
                csvTemplate: {
                    weather: 'location,district,temperature,humidity,pressure,wind_speed,wind_direction,rainfall,condition,recorded_at',
                    river:   'station_name,river_name,location,district,level_meters,normal_level_meters,alert_level_meters,critical_level_meters,recorded_at'
                }
            }
        });
    } catch (err) {
        console.error('getPipelineStatus error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};
