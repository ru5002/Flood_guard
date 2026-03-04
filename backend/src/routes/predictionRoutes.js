const express = require('express');
const router = express.Router();
const predictionsController = require('../controllers/predictionsController');
const { adminAuth } = require('../middleware/adminAuth');

// Public – readable by the frontend without login
router.get('/latest',           predictionsController.getLatestPredictions);
router.get('/summary',          predictionsController.getPredictionSummary);
router.get('/history/:location', predictionsController.getPredictionHistory);

// Admin-protected – bulk insert from ML model output or admin panel
router.post('/', adminAuth, predictionsController.createPredictions);

module.exports = router;
