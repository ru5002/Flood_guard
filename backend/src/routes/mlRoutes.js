const express    = require('express');
const router     = express.Router();
const mlCtrl     = require('../controllers/mlController');
const { adminAuth } = require('../middleware/adminAuth');

// GET  /api/ml/status  — check if model is trained
router.get('/status', adminAuth, mlCtrl.getModelStatus);

// POST /api/ml/run     — run inference and save predictions to DB
router.post('/run', adminAuth, mlCtrl.runModel);

// POST /api/ml/ingest  — accept pre-computed predictions JSON (Python ran locally)
router.post('/ingest', adminAuth, mlCtrl.ingestPredictions);

module.exports = router;
