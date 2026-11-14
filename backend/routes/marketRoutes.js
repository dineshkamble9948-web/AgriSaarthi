import express from "express";
import {
  getMarketOptions,
  getMarketPriceHistory,
  getMarketPrices
} from "../controllers/marketController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/options", getMarketOptions);
router.get("/prices/history", getMarketPriceHistory);
router.get("/prices", getMarketPrices);

export default router;
