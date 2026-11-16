import {
  createDiseaseReport,
  listDiseaseReportsByOwner
} from "../config/fallbackStore.js";
import {
  getDiseaseCatalog,
  identifyDisease,
  PlantNetServiceError
} from "../services/plantNetDiseaseService.js";

const MOBILENET_CATALOG = [
  { id: 0, crop: "Apple", name: "Apple Scab", type: "Fungal" },
  { id: 1, crop: "Apple", name: "Apple with Black Rot", type: "Fungal" },
  { id: 2, crop: "Apple", name: "Cedar Apple Rust", type: "Fungal" },
  { id: 3, crop: "Apple", name: "Healthy Apple", type: "Healthy" },
  { id: 4, crop: "Blueberry", name: "Healthy Blueberry Plant", type: "Healthy" },
  { id: 5, crop: "Cherry", name: "Cherry with Powdery Mildew", type: "Fungal" },
  { id: 6, crop: "Cherry", name: "Healthy Cherry Plant", type: "Healthy" },
  { id: 7, crop: "Corn", name: "Corn (Maize) with Cercospora and Gray Leaf Spot", type: "Fungal" },
  { id: 8, crop: "Corn", name: "Corn (Maize) with Common Rust", type: "Fungal" },
  { id: 9, crop: "Corn", name: "Corn (Maize) with Northern Leaf Blight", type: "Fungal" },
  { id: 10, crop: "Corn", name: "Healthy Corn (Maize) Plant", type: "Healthy" },
  { id: 11, crop: "Grape", name: "Grape with Black Rot", type: "Fungal" },
  { id: 12, crop: "Grape", name: "Grape with Esca (Black Measles)", type: "Fungal" },
  { id: 13, crop: "Grape", name: "Grape with Isariopsis Leaf Spot", type: "Fungal" },
  { id: 14, crop: "Grape", name: "Healthy Grape Plant", type: "Healthy" },
  { id: 15, crop: "Orange", name: "Orange with Citrus Greening", type: "Bacterial" },
  { id: 16, crop: "Peach", name: "Peach with Bacterial Spot", type: "Bacterial" },
  { id: 17, crop: "Peach", name: "Healthy Peach Plant", type: "Healthy" },
  { id: 18, crop: "Bell Pepper", name: "Bell Pepper with Bacterial Spot", type: "Bacterial" },
  { id: 19, crop: "Bell Pepper", name: "Healthy Bell Pepper Plant", type: "Healthy" },
  { id: 20, crop: "Potato", name: "Potato with Early Blight", type: "Fungal" },
  { id: 21, crop: "Potato", name: "Potato with Late Blight", type: "Fungal / Oomycete" },
  { id: 22, crop: "Potato", name: "Healthy Potato Plant", type: "Healthy" },
  { id: 23, crop: "Raspberry", name: "Healthy Raspberry Plant", type: "Healthy" },
  { id: 24, crop: "Soybean", name: "Healthy Soybean Plant", type: "Healthy" },
  { id: 25, crop: "Squash", name: "Squash with Powdery Mildew", type: "Fungal" },
  { id: 26, crop: "Strawberry", name: "Strawberry with Leaf Scorch", type: "Fungal" },
  { id: 27, crop: "Strawberry", name: "Healthy Strawberry Plant", type: "Healthy" },
  { id: 28, crop: "Tomato", name: "Tomato with Bacterial Spot", type: "Bacterial" },
  { id: 29, crop: "Tomato", name: "Tomato with Early Blight", type: "Fungal" },
  { id: 30, crop: "Tomato", name: "Tomato with Late Blight", type: "Oomycete" },
  { id: 31, crop: "Tomato", name: "Tomato with Leaf Mold", type: "Fungal" },
  { id: 32, crop: "Tomato", name: "Tomato with Septoria Leaf Spot", type: "Fungal" },
  { id: 33, crop: "Tomato", name: "Tomato with Spider Mites", type: "Pest / Mites" },
  { id: 34, crop: "Tomato", name: "Tomato with Target Spot", type: "Fungal" },
  { id: 35, crop: "Tomato", name: "Tomato Yellow Leaf Curl Virus", type: "Viral" },
  { id: 36, crop: "Tomato", name: "Tomato Mosaic Virus", type: "Viral" },
  { id: 37, crop: "Tomato", name: "Healthy Tomato Plant", type: "Healthy" }
];

const supportedCrops = new Set([
  "Apple",
  "Blueberry",
  "Cherry",
  "Chilli",
  "Corn",
  "Corn (Maize)",
  "Cotton",
  "Grape",
  "Maize",
  "Orange",
  "Other",
  "Peach",
  "Pepper, Bell",
  "Potato",
  "Raspberry",
  "Rice",
  "Soybean",
  "Squash",
  "Strawberry",
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

  // 1. Try MobileNetV2 Deep Learning via ML Service
  const mlApiUrl = (process.env.ML_API_URL || "http://localhost:8000").replace(/\/+$/, "");
  let mlData = null;

  try {
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname || "leaf.jpg");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const mlResponse = await fetch(`${mlApiUrl}/predict-disease`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (mlResponse.ok) {
      mlData = await mlResponse.json();
    }
  } catch (mlErr) {
    console.warn("MobileNetV2 ML service call did not succeed, checking fallback:", mlErr.message);
  }

  if (mlData?.success && mlData?.prediction) {
    const pred = mlData.prediction;
    const topPredictions = pred.top_predictions || [];
    const results = topPredictions.map((tp) => ({
      name: tp.class,
      score: tp.score,
      score_percent: tp.score_percent
    }));

    const report = createDiseaseReport(req.user.id, {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      crop: pred.crop || crop,
      provider: "MobileNetV2",
      model: pred.model_architecture || "MobileNetV2 (PlantVillage Pretrained)",
      prediction: pred,
      results,
      symptoms: pred.symptoms || [],
      recommendation: pred.recommendation || "",
      success: true,
      analysisTime: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      provider: "MobileNetV2",
      model: pred.model_architecture || "MobileNetV2 (PlantVillage Pretrained)",
      message: `Identified condition: ${pred.prediction} (${pred.confidence_percent || Math.round(pred.confidence * 100)}% confidence).`,
      crop: pred.crop || crop,
      prediction: pred,
      results,
      symptoms: pred.symptoms || [],
      recommendation: pred.recommendation || "",
      report
    });
  }

  // 2. Fallback to Pl@ntNet if PLANTNET_API_KEY is configured
  const plantNetApiKey = process.env.PLANTNET_API_KEY?.trim();
  if (plantNetApiKey) {
    try {
      const identification = await identifyDisease({ file: req.file, apiKey: plantNetApiKey });
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
        provider: "Pl@ntNet",
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
  }

  return res.status(503).json({
    success: false,
    message: "Disease detection is not configured. Add PLANTNET_API_KEY to backend/.env or start the ML service."
  });
};

export const getDiseaseCatalogList = async (req, res) => {
  // MobileNetV2 38-class plant disease catalog
  return res.status(200).json({
    success: true,
    provider: "MobileNetV2",
    count: MOBILENET_CATALOG.length,
    catalog: MOBILENET_CATALOG
  });
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
