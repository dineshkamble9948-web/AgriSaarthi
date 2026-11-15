import express from "express";
import { getWeather, getWeatherHistory } from "../controllers/weatherController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/history", getWeatherHistory);
router.get("/", getWeather);

export default router;
