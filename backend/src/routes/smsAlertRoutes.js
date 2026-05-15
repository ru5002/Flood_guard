const express    = require("express");
const router     = express.Router();
const alertCtrl  = require("../controllers/smsAlertController");
const { adminAuth } = require("../middleware/adminAuth");

// All routes require admin authentication
router.post("/dispatch", adminAuth, alertCtrl.dispatchAlert);
router.post("/rain-check", adminAuth, alertCtrl.dispatchRainForecastAlerts);
router.post("/rain-test",  adminAuth, alertCtrl.testRainAlertToNumber);
router.get("/history",   adminAuth, alertCtrl.getAlertHistory);
router.get("/stats",     adminAuth, alertCtrl.getAlertStats);
router.get("/zones",     adminAuth, alertCtrl.getZones);

module.exports = router;
