import {
  createDiseaseReport,
  listDiseaseReportsByOwner
} from "../config/fallbackStore.js";
import {
  getDiseaseCatalog,
  identifyDisease,
  PlantNetServiceError
} from "../services/plantNetDiseaseService.js";

// Verified ICAR & CIBRC Plant Protection Advisory Knowledge Base
const ICAR_DISEASE_ADVISORY = {
  "Early Blight": {
    pathogen: "Alternaria solani",
    symptoms: ["Concentric dark brown rings ('target spots') on older leaves", "Yellowing chlorotic halos around lesions", "Premature defoliation"],
    culturalManagement: "Destroy and burn lower infected foliage. Ensure 2-year rotation with non-solanaceous crops.",
    biologicalControl: "Foliar spray of Trichoderma harzianum @ 5g/L or Pseudomonas fluorescens @ 10g/L.",
    chemicalControl: "Spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin 23% SC @ 1 ml/L (Wait period: 3 days).",
    officialSource: "ICAR-IIHR & CIBRC Approved Fungicides Bulletin"
  },
  "Late Blight": {
    pathogen: "Phytophthora infestans",
    symptoms: ["Water-soaked dark lesions on foliage", "White downy mildew on leaf underside during high humidity", "Rapid black rot of stems"],
    culturalManagement: "Avoid overhead sprinkler irrigation; maintain adequate field drainage; burn infected haulms.",
    biologicalControl: "Prophylactic bio-fungicide seed and soil treatment with Trichoderma viride.",
    chemicalControl: "Prophylactic: Mancozeb 75% WP @ 2.5 g/L. Curative: Cymoxanil 8% + Mancozeb 64% WP @ 3 g/L.",
    officialSource: "ICAR-CPRI & UAS Dharwad Plant Pathology Department"
  },
  "Bacterial Spot": {
    pathogen: "Xanthomonas campestris / perforans",
    symptoms: ["Small, circular, dark water-soaked spots with yellow halos", "Cracked scab-like fruit lesions"],
    culturalManagement: "Use hot-water treated certified seeds (50°C for 25 min); avoid field work while plants are wet.",
    biologicalControl: "Seed treatment with Pseudomonas fluorescens @ 10g/kg seed.",
    chemicalControl: "Spray Copper Oxychloride 50% WP @ 2.5 g/L + Streptocycline @ 0.1 g/L.",
    officialSource: "ICAR-IARI Division of Plant Pathology"
  },
  "Yellow Leaf Curl": {
    pathogen: "Tomato Yellow Leaf Curl Virus (TYLCV - Vector: Whitefly)",
    symptoms: ["Upward curling and cupping of leaflets", "Severe bushiness and stunted growth", "No fruit formation"],
    culturalManagement: "Install 15 yellow sticky traps per acre; plant border rows of maize or sorghum as a living barrier.",
    biologicalControl: "Spray Neem oil (1500 ppm) @ 3-5 ml/L or Lecanicillium lecanii @ 5 g/L.",
    chemicalControl: "Spray Diafenthiuron 50% WP @ 1.2 g/L or Imidacloprid 17.8% SL @ 0.4 ml/L for whitefly control.",
    officialSource: "ICAR-IIHR National Vector Management Guidelines"
  },
  "Common Rust": {
    pathogen: "Puccinia sorghi",
    symptoms: ["Golden-brown to cinnamon-brown powdery pustules on both leaf surfaces"],
    culturalManagement: "Plant rust-tolerant hybrids; eradicate volunteer maize plants.",
    biologicalControl: "Foliar spray with Bacillus subtilis @ 5g/L.",
    chemicalControl: "Spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin + Difenoconazole @ 1 ml/L.",
    officialSource: "ICAR-IIMR (Indian Institute of Maize Research)"
  }
};

const getVerifiedAdvisory = (diseaseName = "") => {
  const name = String(diseaseName);
  for (const [key, advisory] of Object.entries(ICAR_DISEASE_ADVISORY)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return {
        ...advisory,
        disclaimer: "Advisory compiled from ICAR and CIBRC approved label claims. AI screening requires physical verification before chemical pesticide application."
      };
    }
  }
  return {
    pathogen: "Agricultural pathogen requiring field inspection",
    symptoms: ["Leaf discoloration, necrosis or spotting"],
    culturalManagement: "Maintain field sanitation, remove diseased plant debris, and avoid excess nitrogen.",
    biologicalControl: "Prophylactic application of bio-agents (Trichoderma / Pseudomonas).",
    chemicalControl: "Consult local Raitha Samparka Kendra (RSK) officer before applying chemical fungicides.",
    officialSource: "ICAR Integrated Pest & Disease Management Standards",
    disclaimer: "AI prediction provides screening only; physical inspection by an agricultural officer is advised."
  };
};

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

    const icarAdvisory = getVerifiedAdvisory(pred.prediction);

    return res.status(200).json({
      success: true,
      provider: "MobileNetV2",
      model: pred.model_architecture || "MobileNetV2 (PlantVillage Pretrained)",
      message: `Identified condition: ${pred.prediction} (${pred.confidence_percent || Math.round(pred.confidence * 100)}% confidence).`,
      crop: pred.crop || crop,
      prediction: pred,
      results,
      symptoms: pred.symptoms || icarAdvisory.symptoms,
      recommendation: pred.recommendation || `${icarAdvisory.culturalManagement} ${icarAdvisory.chemicalControl}`,
      verifiedIcarAdvisory: icarAdvisory,
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
