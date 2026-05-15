const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const pipeline = require('../controllers/dataPipelineController');
const { adminAuth } = require('../middleware/adminAuth');

// Store CSV file in memory (no disk I/O) – max 5 MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only .csv files are allowed'));
        }
    }
});

// ── Pipeline status (admin only) ────────────────────────────────────────────
router.get('/status', adminAuth, pipeline.getPipelineStatus);

// ── Weather data ─────────────────────────────────────────────────────────────
router.get('/weather',            adminAuth, pipeline.getWeatherData);
router.post('/weather/manual',    adminAuth, pipeline.addWeatherManual);
router.post('/weather/upload',    adminAuth, upload.single('file'), pipeline.uploadWeatherCSV);

// ── River level data ─────────────────────────────────────────────────────────
router.get('/river',              adminAuth, pipeline.getRiverData);
router.post('/river/manual',      adminAuth, pipeline.addRiverManual);
router.post('/river/upload',      adminAuth, upload.single('file'), pipeline.uploadRiverCSV);

module.exports = router;
