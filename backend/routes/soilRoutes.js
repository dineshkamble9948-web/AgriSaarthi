import express from "express";
import {
  getFertilizerRecommendations,
  getSoilHistory,
  lookupSoil
} from "../controllers/soilController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/lookup", lookupSoil);
router.post("/recommendations", getFertilizerRecommendations);
router.get("/history", getSoilHistory);

export default router;
