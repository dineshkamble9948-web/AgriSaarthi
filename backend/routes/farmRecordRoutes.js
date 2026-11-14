
import express from "express";
import {
  createRecord,
  getRecords,
  updateRecord,
  deleteRecord,
} from "../controllers/farmRecordController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getRecords);
router.post("/", protect, createRecord);
router.put("/:id", protect, updateRecord);
router.delete("/:id", protect, deleteRecord);

export default router;
