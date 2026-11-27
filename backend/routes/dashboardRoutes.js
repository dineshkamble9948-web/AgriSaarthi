import express from "express";
import { getUnifiedPlotDashboard } from "../controllers/dashboardController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// GET /api/plots/:plotId/dashboard
router.get("/:plotId/dashboard", getUnifiedPlotDashboard);

export default router;
