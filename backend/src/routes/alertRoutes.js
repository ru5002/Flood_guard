const express    = require("express");
const router     = express.Router();
const alertCtrl  = require("../controllers/alertController");
const { adminAuth } = require("../middleware/adminAuth");

// All routes require admin authentication
router.post("/dispatch",       adminAuth, alertCtrl.dispatchAlert);
router.post("/demo",          adminAuth, alertCtrl.sendDemoAlert);
router.post("/email-dispatch", adminAuth, alertCtrl.dispatchEmailAlert);
router.post("/email-demo",    adminAuth, alertCtrl.sendDemoEmailAlert);
router.post("/rain-check", adminAuth, alertCtrl.dispatchRainForecastAlerts);
router.post("/rain-test",  adminAuth, alertCtrl.testRainAlertToNumber);
router.get("/history",   adminAuth, alertCtrl.getAlertHistory);
router.get("/stats",     adminAuth, alertCtrl.getAlertStats);
router.get("/zones",     adminAuth, alertCtrl.getZones);

module.exports = router;
