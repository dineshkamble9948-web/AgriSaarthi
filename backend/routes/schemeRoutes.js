import express from "express";
import { listSchemes, getSchemeDetails } from "../controllers/schemeController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow public browsing or authenticated personalized view
router.get("/", (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  return listSchemes(req, res);
}, listSchemes);

router.get("/:id", getSchemeDetails);

export default router;
