const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const Prediction = require('../models/Prediction');

const ML_DIR     = path.join(__dirname, '..', '..', '..', 'ml');
const MODEL_DIR  = path.join(ML_DIR, 'models');
const WEATHER_CSV = path.join(__dirname, '..', '..', '..', 'ml', 'data', 'processed', 'cleaned_dataset.csv');
const RIVER_CSV   = path.join(__dirname, '..', '..', '..', 'ml', 'data', 'processed', 'cleaned_dataset.csv');
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

const pythonCmd = () => {
    if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
    const localPython = process.platform === 'win32'
        ? path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe')
        : path.join(PROJECT_ROOT, '.venv', 'bin', 'python');
    return fs.existsSync(localPython) ? localPython : (process.platform === 'win32' ? 'python' : 'python3');
};

const latestDatasetPayload = () => {
    if (!fs.existsSync(WEATHER_CSV)) return [];
    const rows = fs.readFileSync(WEATHER_CSV, 'utf8').trim().split(/\r?\n/).slice(1);
    return rows.slice(-14).map((line) => {
        const [date, waterLevel] = line.split(',');
        return { date, water_level: Number(waterLevel) };
    });
};

/**
 * POST /api/ml/run
 * Runs predict.py, parses JSON output, saves predictions to MongoDB.
 */
exports.runModel = async (req, res) => {
    const predictScript = path.join(__dirname, '..', '..', '..', 'ml', 'predict_lstm.py');

    if (!fs.existsSync(predictScript)) {
        return res.status(500).json({ success: false, message: 'predict.py not found in ml/ folder.' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            const proc = spawn(pythonCmd(), [predictScript]);

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());

            proc.stdin.write(JSON.stringify(latestDatasetPayload()));
            proc.stdin.end();

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

        if (result.error) return res.status(500).json({ success: false, message: result.error });

        const dayOne = result.day1;
        const inserted = await Prediction.create({
            location: result.location || 'Dunamale',
            district: result.district || 'Gampaha',
            prediction: dayOne.prediction || `Random Forest prediction: ${dayOne.riskLevel}`,
            riskLevel: dayOne.riskLevel,
            riverRisk: dayOne.riskLevel,
            floodProbability: dayOne.probabilities?.[dayOne.riskLevel] || 0,
            confidence: dayOne.confidence || 0,
            modelVersion: result.modelVersion || 'rf-aththanagalu-v1',
            source: 'ml_model',
            validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
        });

        return res.status(201).json({
            success: true,
            count: 1,
            modelVersion: result.modelVersion || 'rf-aththanagalu-v1',
            message: 'Random Forest model ran. Prediction saved to database.',
            rawPrediction: result,
            predictions: [inserted],
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
    const modelPath  = path.join(__dirname, '..', '..', '..', 'ml', 'models', 'floodguard_rf_model.joblib');
    const metricsPath = path.join(__dirname, '..', '..', '..', 'ml', 'results', 'rf_metrics.json');

    const modelTrained  = fs.existsSync(modelPath);
    const metricsExists  = fs.existsSync(metricsPath);

    res.json({
        success: true,
        modelTrained,
        files: {
            model:  { path: modelPath,  exists: modelTrained },
            metrics: { path: metricsPath, exists: metricsExists },
        },
        csvFiles: {
            processedData: { path: WEATHER_CSV, exists: fs.existsSync(WEATHER_CSV) }
        },
        nextStep: (!modelTrained)
            ? 'Run: python ml/train.py'
            : 'Model ready. POST /api/ml/run to generate predictions.',
    });
};
