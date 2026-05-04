const express          = require("express");
const cors             = require("cors");
const adminRoutes      = require("./routes/adminRoutes");
const userRoutes       = require("./routes/userRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const pipelineRoutes   = require("./routes/dataPipelineRoutes");
const mlRoutes         = require("./routes/mlRoutes");
const alertRoutes      = require("./routes/smsAlertRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("FloodGuard backend is running");
});

// Admin routes
app.use("/api/admin", adminRoutes);

// User routes
app.use("/api/users", userRoutes);

// Prediction routes  (public GET, admin-only POST)
app.use("/api/predictions", predictionRoutes);

// Data-pipeline routes  (CSV upload + manual entry – admin only)
app.use("/api/pipeline", pipelineRoutes);

// ML model routes  (admin only – run LSTM inference, check status)
app.use("/api/ml", mlRoutes);

// SMS alert routes  (admin only – dispatch zone alerts, view history)
app.use("/api/alerts", alertRoutes);

// Public weather proxy – avoids CORS/key issues for the frontend dashboard
app.get("/api/weather/current", async (req, res) => {
    try {
        const axios = require("axios");
        const lat = req.query.lat || 7.084;
        const lon = req.query.lon || 79.9997;
        const apiKey = process.env.OPENWEATHER_KEY || "bd5e378503939ddaee76f12ad7a97608";
        const url = `https://api.openweathermap.org/data/2.5/weather`;
        const resp = await axios.get(url, {
            params: { lat, lon, units: "metric", appid: apiKey },
            timeout: 8000,
        });
        const data = resp.data;
        res.json({
            temp: Math.round(data.main.temp),
            condition: data.weather?.[0]?.main || "",
            humidity: data.main.humidity,
            wind: data.wind?.speed || 0,
            rainfall: data.rain?.["1h"] || data.rain?.["3h"] || 0,
            location: data.name || "Gampaha",
        });
    } catch (err) {
        console.error("Weather proxy error:", err.message);
        // Return realistic fallback data so the frontend still renders
        res.json({
            temp: 29,
            condition: "Partly Cloudy",
            humidity: 78,
            wind: 3.2,
            rainfall: 0,
            location: "Gampaha",
            fallback: true,
        });
    }
});

module.exports = app;
