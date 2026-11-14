
import express from "express";

import {
  saveFarm,
  getMyFarm
} from "../controllers/farmController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMyFarm);

router.post("/", saveFarm);

export default router;
