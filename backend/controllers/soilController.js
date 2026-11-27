import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import SoilAssessment from "../models/SoilAssessment.js";
import {
  createSoilAssessment,
  findFarmByIdAndOwner,
  findSoilAssessmentByIdAndOwner,
  isFallbackMode,
  listFarmPlots,
  listSoilAssessmentsByOwner,
  updateSoilAssessment
} from "../config/fallbackStore.js";
import {
  getSoilData,
  SoilProviderError
} from "../services/soilDataService.js";
import { createFertilizerRecommendation } from "../services/fertilizerRecommendationService.js";

const isNumberInRange = (value, minimum, maximum) => (
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
);

const validateCoordinates = (body) => {
  if (!body || !isNumberInRange(body.latitude, -90, 90)
    || !isNumberInRange(body.longitude, -180, 180)) {
    return "Latitude must be between -90 and 90 and longitude between -180 and 180.";
  }
  return "";
};

const resolveFarmScope = async (body, ownerId) => {
  const farmId = body?.farmId;
  const plotId = body?.plotId;
  if (farmId != null && (typeof farmId !== "string" || farmId.length > 100)) {
    return { error: "farmId is invalid.", statusCode: 400 };
  }
  if (plotId != null && (typeof plotId !== "string" || plotId.length > 100)) {
    return { error: "plotId is invalid.", statusCode: 400 };
  }
  if (plotId && !farmId) {
    return { error: "A farmId is required when associating a plot.", statusCode: 400 };
  }
  if (!farmId) {
    return { farm: null, plot: null };
  }

  try {
    const farm = isFallbackMode()
      ? findFarmByIdAndOwner(farmId, ownerId)
      : await Farm.findOne({ _id: farmId, owner: ownerId });
    if (!farm) {
      return { error: "Farm was not found.", statusCode: 404 };
    }

    let plot = null;
    if (plotId) {
      plot = isFallbackMode()
        ? listFarmPlots(farmId, ownerId).find((item) => String(item._id) === plotId)
        : await FarmPlot.findOne({ _id: plotId, farm: farmId, owner: ownerId });
      if (!plot) {
        return { error: "Plot was not found for this farm.", statusCode: 404 };
      }
    }
    return { farm, plot };
  } catch (error) {
    if (error?.name === "CastError") {
      return { error: "Farm or plot ID is invalid.", statusCode: 400 };
    }
    throw error;
  }
};

const newAssessment = (farmerId, payload) => (
  isFallbackMode()
    ? createSoilAssessment(farmerId, payload)
    : new SoilAssessment({ farmerId, ...payload })
);

const saveAssessment = async (assessment) => {
  if (isFallbackMode()) return assessment;
  return assessment.save();
};

const assessmentForOwner = async (assessmentId, farmerId) => (
  isFallbackMode()
    ? findSoilAssessmentByIdAndOwner(assessmentId, farmerId)
    : SoilAssessment.findOne({ _id: assessmentId, farmerId })
);

export const lookupSoil = async (req, res) => {
  let scope;
  try {
    scope = await resolveFarmScope(req.body, req.user._id);
  } catch (error) {
    console.error("Farm lookup for soil assessment failed:", error);
    return res.status(500).json({ success: false, message: "Could not verify the selected farm." });
  }
  if (scope.error) {
    return res.status(scope.statusCode).json({ success: false, message: scope.error });
  }

  const latitude = req.body.latitude ?? scope.farm?.latitude;
  const longitude = req.body.longitude ?? scope.farm?.longitude;
  const coordinateError = validateCoordinates({ latitude, longitude });
  if (coordinateError) {
    return res.status(400).json({ success: false, message: coordinateError });
  }

  try {
    const soil = await getSoilData(latitude, longitude);
    const assessment = await saveAssessment(newAssessment(req.user._id, {
      farm: scope.farm?._id ?? null,
      plot: scope.plot?._id ?? null,
      location: { latitude, longitude },
      soilParameters: soil.parameters,
      source: "SoilGrids",
      retrievedAt: new Date(),
      missingProperties: soil.missingProperties
    }));

    return res.status(200).json({
      success: true,
      assessment,
      cacheHit: soil.cacheHit
    });
  } catch (error) {
    if (error instanceof SoilProviderError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Soil assessment storage failed:", error);
    return res.status(500).json({
      success: false,
      message: "Soil data was retrieved but could not be saved. Please retry."
    });
  }
};

const VALID_STATUSES = new Set(["unknown", "low", "medium", "adequate", "high"]);
const VALID_NPK_UNITS = new Set(["kg/ha", "mg/kg"]);

const validateRecommendationInput = (body) => {
  if (!body || typeof body.crop !== "string" || !body.crop.trim() || body.crop.trim().length > 60) {
    return "Select a crop name between 1 and 60 characters.";
  }
  const coordinateError = validateCoordinates(body);
  if (coordinateError) return coordinateError;
  if (body.soilPh !== undefined && body.soilPh !== null
    && !isNumberInRange(body.soilPh, 0, 14)) {
    return "Soil pH must be between 0 and 14.";
  }

  const npk = body.laboratoryNPK;
  if (!npk || typeof npk !== "object" || Array.isArray(npk)) {
    return "Provide laboratory-tested N, P, and K values and their unit.";
  }
  if (!VALID_NPK_UNITS.has(npk.unit)) {
    return "Choose kg/ha or mg/kg to match the soil laboratory report.";
  }

  for (const key of ["nitrogen", "phosphorus", "potassium"]) {
    if (!isNumberInRange(npk[key], 0, 100000)) {
      return `${key} must be a non-negative laboratory value.`;
    }
    if (!VALID_STATUSES.has(npk.status?.[key])) {
      return `Select the laboratory interpretation for ${key}.`;
    }
  }
  return "";
};

export const getFertilizerRecommendations = async (req, res) => {
  const validationError = validateRecommendationInput(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const {
    assessmentId,
    latitude,
    longitude,
    soilPh = null,
    laboratoryNPK,
    crop,
    cropGrowthStage,
    landArea,
    areaUnit,
    isActualSoilTest,
    district
  } = req.body;
  let scope;
  try {
    scope = await resolveFarmScope(req.body, req.user._id);
  } catch (error) {
    console.error("Farm lookup for fertilizer recommendation failed:", error);
    return res.status(500).json({ success: false, message: "Could not verify the selected farm." });
  }
  if (scope.error) {
    return res.status(scope.statusCode).json({ success: false, message: scope.error });
  }

  const effectiveArea = landArea || scope.plot?.area || scope.farm?.area || 1;
  const effectiveUnit = areaUnit || scope.plot?.areaUnit || scope.farm?.areaUnit || "acres";
  const effectiveDistrict = district || scope.farm?.district || "Raichur";

  const recommendation = createFertilizerRecommendation({
    crop: crop.trim(),
    soilPh,
    laboratoryNPK,
    cropGrowthStage: cropGrowthStage || "Basal / Sowing",
    landArea: Number(effectiveArea),
    areaUnit: effectiveUnit,
    isActualSoilTest: isActualSoilTest !== false,
    district: effectiveDistrict
  });
  const reportFields = {
    location: { latitude, longitude },
    selectedCrop: crop.trim(),
    laboratoryNPK,
    fertilizerRecommendation: recommendation
  };
  if (scope.farm) reportFields.farm = scope.farm._id;
  if (scope.plot) reportFields.plot = scope.plot._id;

  try {
    let assessment = null;
    if (assessmentId) {
      if (typeof assessmentId !== "string" || assessmentId.length > 100) {
        return res.status(400).json({ success: false, message: "assessmentId is invalid." });
      }
      assessment = await assessmentForOwner(assessmentId, req.user._id);
      if (!assessment) {
        return res.status(404).json({ success: false, message: "Soil assessment was not found." });
      }
      if (scope.farm && assessment.farm && String(assessment.farm) !== String(scope.farm._id)) {
        return res.status(400).json({
          success: false,
          message: "The soil assessment belongs to a different farm."
        });
      }
      if (isFallbackMode()) {
        assessment = updateSoilAssessment(assessmentId, req.user._id, reportFields);
      } else {
        Object.assign(assessment, reportFields);
        await assessment.save();
      }
    } else {
      assessment = await saveAssessment(newAssessment(req.user._id, {
        ...reportFields,
        farm: scope.farm?._id ?? null,
        plot: scope.plot?._id ?? null,
        soilParameters: {},
        source: "laboratory-test",
        retrievedAt: null
      }));
    }

    return res.status(200).json({
      success: true,
      assessment,
      recommendation
    });
  } catch (error) {
    console.error("Fertilizer recommendation storage failed:", error);
    return res.status(500).json({
      success: false,
      message: "The recommendation could not be saved. Please retry."
    });
  }
};

export const getSoilHistory = async (req, res) => {
  try {
    const scope = await resolveFarmScope({
      farmId: req.query.farmId,
      plotId: req.query.plotId
    }, req.user._id);
    if (scope.error) {
      return res.status(scope.statusCode).json({ success: false, message: scope.error });
    }
    const history = isFallbackMode()
      ? listSoilAssessmentsByOwner(req.user._id, scope.farm?._id, scope.plot?._id)
      : await SoilAssessment.find({
        farmerId: req.user._id,
        ...(scope.farm ? { farm: scope.farm._id } : {}),
        ...(scope.plot ? { plot: scope.plot._id } : {})
      })
        .sort({ retrievedAt: -1, createdAt: -1 })
        .limit(20)
        .lean();
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Soil history request failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve soil assessment history."
    });
  }
};
