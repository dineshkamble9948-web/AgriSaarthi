import express from "express";
import {
  recommendCrops,
  getDistricts,
  getTaluks,
  getRegionalSoil,
  getRegionalRainfall
} from "../controllers/cropRecommendationController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow public/open or authenticated retrieval of regional metadata
router.get("/karnataka/districts", getDistricts);
router.get("/karnataka/taluks", getTaluks);
router.get("/karnataka/soil", getRegionalSoil);
router.get("/karnataka/rainfall", getRegionalRainfall);

// Recommendation endpoint protected by user authentication
router.post("/recommend", protect, recommendCrops);

export default router;
