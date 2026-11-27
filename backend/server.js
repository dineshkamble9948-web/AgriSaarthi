import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import connectDB from "./config/db.js";
import { isFallbackMode } from "./config/fallbackStore.js";
import authRoutes from "./routes/authRoutes.js";
import farmRoutes from "./routes/farmRoutes.js";
import agriculturalRecordRoutes from "./routes/agriculturalRecordRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import cropRecommendationRoutes from "./routes/cropRecommendationRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import soilRoutes from "./routes/soilRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import schemeRoutes from "./routes/schemeRoutes.js";
import officerRoutes from "./routes/officerRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") });

const app = express();
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like curl, mobile, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      const isAllowed =
        configuredOrigins.includes("*") ||
        configuredOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith(".onrender.com") ||
        normalizedOrigin.includes("localhost") ||
        normalizedOrigin.includes("127.0.0.1");

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to AgriSaarthi API",
    status: "Running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "AgriSaarthi Backend",
    database: isFallbackMode() ? "fallback" : "mongodb",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/farms", farmRoutes);
app.use("/api/records", agriculturalRecordRoutes);
app.use("/api/disease", diseaseRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/crops", cropRecommendationRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/soil", soilRoutes);
app.use("/api/plots", dashboardRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/officers", officerRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/reports", reportRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server."
  });
});

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
};

startServer();
