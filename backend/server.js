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

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") });

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
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
