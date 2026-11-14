import express from "express";
import multer from "multer";

import {
  analyzeDisease,
  getDiseaseCatalogList,
  getDiseaseHistory
} from "../controllers/diseaseController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      return callback(new Error("Only JPEG and PNG images are supported."));
    }
    return callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    const statusCode = error instanceof multer.MulterError
      && error.code === "LIMIT_FILE_SIZE"
      ? 413
      : 400;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 413
        ? "Image must be 5 MB or smaller."
        : error.message || "Invalid image upload."
    });
  });
};

router.use(protect);
router.get("/history", getDiseaseHistory);
router.get("/catalog", getDiseaseCatalogList);
router.post("/analyze", handleUpload, analyzeDisease);

export default router;
