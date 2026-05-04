const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const Prediction = require('../models/Prediction');

const ML_DIR     = path.join(__dirname, '..', '..', '..', 'ml');
const MODEL_DIR  = path.join(ML_DIR, 'models');
const WEATHER_CSV = path.join(__dirname, '..', '..', '..', 'ml', 'data', 'processed', 'cleaned_dataset.csv');
const RIVER_CSV   = path.join(__dirname, '..', '..', '..', 'ml', 'data', 'processed', 'cleaned_dataset.csv');

const pythonCmd = () => process.platform === 'win32' ? 'python' : 'python3';

/**
 * POST /api/ml/run
 * Runs predict.py, parses JSON output, saves predictions to MongoDB.
 */
exports.runModel = async (req, res) => {
    const predictScript = path.join(__dirname, '..', '..', '..', 'ml', 'predict_real.py');

    if (!fs.existsSync(predictScript)) {
        return res.status(500).json({ success: false, message: 'predict.py not found in ml/ folder.' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            const proc = spawn(pythonCmd(), [
                predictScript,
                '--weather-csv', WEATHER_CSV,
                '--river-csv',   RIVER_CSV,
                '--model-dir',   MODEL_DIR,
            ]);

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());

            proc.on('close', code => {
                if (code !== 0) {
                    return reject(new Error(`Python exited ${code}. ${stderr.slice(0, 400)}`));
                }
                try {
                    const parsed = JSON.parse(stdout.trim());
                    if (parsed.error) return reject(new Error(parsed.error));
                    resolve(parsed);
                } catch {
                    reject(new Error(`Could not parse model output: ${stdout.slice(0, 200)}`));
                }
            });

            proc.on('error', err => reject(new Error(`Failed to start Python: ${err.message}`)));
        });

        const { predictions } = result;
        if (!predictions || !predictions.length) {
            return res.status(500).json({ success: false, message: 'Model returned no predictions.' });
        }

        const inserted = await Prediction.insertMany(predictions, { ordered: false });

        return res.status(201).json({
            success: true,
            count: inserted.length,
            modelVersion: predictions[0]?.modelVersion || 'v1.0-lstm',
            message: `LSTM model ran. ${inserted.length} predictions saved to database.`,
            predictions: inserted,
        });

    } catch (err) {
        console.error('[ML] runModel error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/ml/ingest
 * Accepts pre-computed predictions JSON and saves them to MongoDB.
 * Use this when Python runs locally but backend runs in Docker.
 * Body: { "predictions": [ { location, riskLevel, floodProbability, ... } ] }
 */
exports.ingestPredictions = async (req, res) => {
    try {
        const { predictions } = req.body;

        if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
            return res.status(400).json({ success: false, message: 'Body must have a non-empty "predictions" array.' });
        }

        const inserted = await Prediction.insertMany(predictions, { ordered: false });

        return res.status(201).json({
            success: true,
            count: inserted.length,
            modelVersion: predictions[0]?.modelVersion || 'v1.0-lstm',
            message: `${inserted.length} LSTM predictions saved to database.`,
            predictions: inserted,
        });
    } catch (err) {
        console.error('[ML] ingestPredictions error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/ml/status
 * Reports whether the trained model files exist.
 */
exports.getModelStatus = (req, res) => {
    const modelPath  = path.join(__dirname, '..', '..', '..', 'ml', 'models', 'floodguard_lstm_model.keras');
    const scalerPath = path.join(__dirname, '..', '..', '..', 'ml', 'models', 'floodguard_scaler.pkl');

    const modelTrained  = fs.existsSync(modelPath);
    const scalerExists  = fs.existsSync(scalerPath);

    res.json({
        success: true,
        modelTrained: modelTrained && scalerExists,
        files: {
            model:  { path: modelPath,  exists: modelTrained },
            scaler: { path: scalerPath, exists: scalerExists },
        },
        csvFiles: {
            processedData: { path: WEATHER_CSV, exists: fs.existsSync(WEATHER_CSV) }
        },
        nextStep: (!modelTrained || !scalerExists)
            ? 'Run: python ml/train_real.py'
            : 'Model ready. POST /api/ml/run to generate predictions.',
    });
};
