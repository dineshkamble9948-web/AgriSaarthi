import express from "express";
import { recommendCrops } from "../controllers/cropRecommendationController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/recommend", recommendCrops);

export default router;
