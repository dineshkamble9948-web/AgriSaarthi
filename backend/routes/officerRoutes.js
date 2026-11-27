import express from "express";
import { listOfficers } from "../controllers/officerController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  return listOfficers(req, res);
}, listOfficers);

export default router;
