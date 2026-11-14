import express from "express";
import { getWeather } from "../controllers/weatherController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getWeather);

export default router;
