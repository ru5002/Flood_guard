const express          = require("express");
const cors             = require("cors");
const adminRoutes      = require("./routes/adminRoutes");
const userRoutes       = require("./routes/userRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const pipelineRoutes   = require("./routes/dataPipelineRoutes");
const mlRoutes         = require("./routes/mlRoutes");
const alertRoutes      = require("./routes/alertRoutes");
const { fetchCurrentWeather } = require("./services/liveWeatherService");

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

// ML model routes  (admin only – run model inference, check status)
app.use("/api/ml", mlRoutes);

// Alert routes  (admin only – dispatch SMS/email zone alerts, view history)
app.use("/api/alerts", alertRoutes);

// Public weather proxy – avoids CORS/key issues for the frontend dashboard
app.get("/api/weather/current", async (req, res) => {
    try {
        const lat = req.query.lat || 7.084;
        const lon = req.query.lon || 79.9997;
        const data = await fetchCurrentWeather(lat, lon);
        res.json({
            temp: Math.round(data.temp),
            condition: data.condition,
            humidity: data.humidity,
            wind: data.wind,
            rainfall: data.rainfall,
            location: data.location,
            source: data.source,
            fetchedAt: data.fetchedAt,
            cache: data.cache,
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
