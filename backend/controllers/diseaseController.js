import {
  createDiseaseReport,
  listDiseaseReportsByOwner
} from "../config/fallbackStore.js";
import {
  getDiseaseCatalog,
  identifyDisease,
  PlantNetServiceError
} from "../services/plantNetDiseaseService.js";

const supportedCrops = new Set([
  "Cotton",
  "Chilli",
  "Maize",
  "Other",
  "Potato",
  "Rice",
  "Soybean",
  "Tomato",
  "Wheat"
]);

const isSupportedImage = (file) => {
  if (!file) return false;

  if (file.mimetype === "image/jpeg") {
    return file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return file.buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  return false;
};

const getApiKey = (res) => {
  const apiKey = process.env.PLANTNET_API_KEY?.trim();
  if (apiKey) return apiKey;

  res.status(503).json({
    success: false,
    message: "Disease detection is not configured. Add PLANTNET_API_KEY to backend/.env and restart the backend."
  });
  return null;
};

const sendProviderError = (res, error, action) => {
  if (error instanceof PlantNetServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  console.error(`${action} error:`, error);
  return res.status(502).json({
    success: false,
    message: "Disease detection is temporarily unavailable. Please try again."
  });
};

export const analyzeDisease = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload a leaf image to analyze."
    });
  }

  if (!isSupportedImage(req.file)) {
    return res.status(400).json({
      success: false,
      message: "The image content must be a valid JPEG or PNG file."
    });
  }

  const crop = typeof req.body?.crop === "string" ? req.body.crop.trim() : "";
  if (!supportedCrops.has(crop)) {
    return res.status(400).json({
      success: false,
      message: "Choose a crop from the list, or select Other."
    });
  }

  const apiKey = getApiKey(res);
  if (!apiKey) return;

  try {
    const identification = await identifyDisease({ file: req.file, apiKey });
    const results = identification.results;
    const report = createDiseaseReport(req.user.id, {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      crop,
      provider: "Pl@ntNet",
      results,
      language: identification.language || "en",
      success: true,
      analysisTime: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: results.length
        ? "Possible disease matches returned by Pl@ntNet."
        : "Pl@ntNet did not identify a disease match.",
      crop,
      results,
      language: identification.language || "en",
      version: identification.version || null,
      remainingIdentificationRequests: identification.remainingIdentificationRequests ?? null,
      report
    });
  } catch (error) {
    return sendProviderError(res, error, "Disease analysis");
  }
};

export const getDiseaseCatalogList = async (req, res) => {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  try {
    const catalog = await getDiseaseCatalog(apiKey);
    return res.status(200).json({
      success: true,
      count: catalog.length,
      catalog
    });
  } catch (error) {
    return sendProviderError(res, error, "Disease catalog");
  }
};

export const getDiseaseHistory = async (req, res) => {
  try {
    const reports = listDiseaseReportsByOwner(req.user.id);

    return res.status(200).json({
      success: true,
      history: reports
    });
  } catch (error) {
    console.error("Disease history error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch disease history."
    });
  }
};
