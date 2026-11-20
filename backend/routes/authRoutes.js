
import express from "express";

import {
  registerUser,
  loginUser,
  demoLogin,
  getMe,
  updateLocation,
  reverseGeocodeEndpoint
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/demo-login", demoLogin);

router.get("/me", protect, getMe);

router.post("/location", protect, updateLocation);

router.get("/reverse-geocode", reverseGeocodeEndpoint);

export default router;
