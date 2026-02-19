const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("FloodGuard backend is running");
});

// Admin routes
app.use("/api/admin", adminRoutes);

module.exports = app;
