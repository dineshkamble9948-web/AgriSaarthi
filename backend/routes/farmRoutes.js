
import express from "express";

import {
  createFarmPlot,
  getFarmPlots,
  getMyFarms,
  saveFarm,
  getMyFarm,
  updateFarmPlot
} from "../controllers/farmController.js";
import {
  createCropCycle,
  getCropCycles,
  updateCropCycle
} from "../controllers/cropCycleController.js";
import {
  getSatelliteHistoryForFarm,
  getSatelliteMonitoringForFarm
} from "../controllers/satelliteController.js";
import { getIrrigationGuidance } from "../controllers/irrigationController.js";
import {
  acknowledgeFarmAlert,
  getFarmAlerts
} from "../controllers/farmAlertController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMyFarm);
router.get("/", getMyFarms);

router.post("/", saveFarm);
router.get("/:farmId/plots", getFarmPlots);
router.post("/:farmId/plots", createFarmPlot);
router.patch("/:farmId/plots/:plotId", updateFarmPlot);
router.get("/:farmId/crops", getCropCycles);
router.post("/:farmId/crops", createCropCycle);
router.patch("/:farmId/crops/:cycleId", updateCropCycle);
router.get("/:farmId/satellite/history", getSatelliteHistoryForFarm);
router.get("/:farmId/satellite", getSatelliteMonitoringForFarm);
router.get("/:farmId/irrigation", getIrrigationGuidance);
router.get("/:farmId/alerts", getFarmAlerts);
router.patch("/:farmId/alerts/:alertId/acknowledge", acknowledgeFarmAlert);

export default router;
