import express from "express";
import { getFarmingCalendar, toggleCalendarTask } from "../controllers/farmingCalendarController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getFarmingCalendar);
router.post("/toggle", toggleCalendarTask);

export default router;
