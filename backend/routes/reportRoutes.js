import express from "express";
import { getPlotHealthReport } from "../controllers/reportController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/plots/:plotId/health-report", getPlotHealthReport);

export default router;
