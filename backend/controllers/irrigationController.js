import CropCycle from "../models/CropCycle.js";
import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import SoilAssessment from "../models/SoilAssessment.js";
import {
  findFarmByIdAndOwner,
  isFallbackMode,
  listCropCyclesByFarm,
  listFarmPlots,
  listSoilAssessmentsByOwner
} from "../config/fallbackStore.js";
import {
  getWeatherForCoordinates,
  getWeatherForLocation,
  WeatherProviderError
} from "../services/weatherService.js";
import { createIrrigationRecommendation } from "../services/irrigationRecommendationService.js";
import { withCropStageEstimate } from "../services/cropLifecycleService.js";

const findOwnedFarm = async (farmId, ownerId) => (
  isFallbackMode()
    ? findFarmByIdAndOwner(farmId, ownerId)
    : await Farm.findOne({ _id: farmId, owner: ownerId })
);

const findOwnedPlot = async (farmId, plotId, ownerId) => (
  isFallbackMode()
    ? listFarmPlots(farmId, ownerId).find((plot) => String(plot._id) === String(plotId))
    : await FarmPlot.findOne({ _id: plotId, farm: farmId, owner: ownerId })
);

const getLatestCropCycle = async (farmId, plotId, ownerId) => {
  const cycles = isFallbackMode()
    ? listCropCyclesByFarm(farmId, ownerId)
    : await CropCycle.find({ farm: farmId, owner: ownerId })
      .sort({ sowingDate: -1 })
      .lean();
  const candidates = plotId
    ? cycles.filter((cycle) => String(cycle.plot) === String(plotId))
    : cycles;
  const today = new Date();
  const activeCycle = candidates.find((cycle) => (
    !cycle.actualHarvestDate
    && new Date(cycle.sowingDate) <= today
    && new Date(cycle.expectedHarvestDate) >= today
  ));
  const selected = activeCycle || candidates[0];
  return selected ? withCropStageEstimate(selected) : null;
};

const getLatestSoilAssessment = async (farmId, plotId, ownerId) => {
  if (isFallbackMode()) {
    const plotAssessments = plotId
      ? listSoilAssessmentsByOwner(ownerId, farmId, plotId)
      : [];
    return plotAssessments[0]
      || listSoilAssessmentsByOwner(ownerId, farmId)[0]
      || null;
  }

  if (plotId) {
    const plotAssessment = await SoilAssessment.findOne({
      farmerId: ownerId,
      farm: farmId,
      plot: plotId
    }).sort({ retrievedAt: -1, createdAt: -1 }).lean();
    if (plotAssessment) return plotAssessment;
  }
  return SoilAssessment.findOne({
    farmerId: ownerId,
    farm: farmId
  }).sort({ retrievedAt: -1, createdAt: -1 }).lean();
};

export const getIrrigationGuidance = async (req, res) => {
  const plotId = typeof req.query.plotId === "string" ? req.query.plotId.trim() : "";
  if (plotId.length > 100) {
    return res.status(400).json({ success: false, message: "plotId is invalid." });
  }

  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }
    const plot = plotId ? await findOwnedPlot(req.params.farmId, plotId, req.user._id) : null;
    if (plotId && !plot) {
      return res.status(404).json({ success: false, message: "Plot not found for this farm." });
    }

    const [cropCycle, soilAssessment] = await Promise.all([
      getLatestCropCycle(req.params.farmId, plotId, req.user._id),
      getLatestSoilAssessment(req.params.farmId, plotId, req.user._id)
    ]);

    let weather = null;
    let weatherError = "";
    const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
    if (!apiKey) {
      weatherError = "OPENWEATHER_API_KEY is not configured.";
    } else {
      try {
        const point = plot?.latitude != null && plot?.longitude != null ? plot : farm;
        if (point.latitude != null && point.longitude != null) {
          weather = await getWeatherForCoordinates(
            point.latitude,
            point.longitude,
            apiKey,
            farm.farmName
          );
        } else if (farm.location) {
          weather = await getWeatherForLocation(farm.location, farm.state, apiKey);
        } else {
          weatherError = "The farm has no saved coordinates or location.";
        }
      } catch (error) {
        if (error instanceof WeatherProviderError) {
          weatherError = error.message;
        } else {
          throw error;
        }
      }
    }

    const guidance = createIrrigationRecommendation({
      cropCycle,
      weather,
      weatherError,
      soilAssessment,
      soilType: farm.soilType || ""
    });
    return res.json({
      success: true,
      guidance,
      weather,
      cropCycle,
      soilAssessment
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm or plot ID is invalid." });
    }
    console.error("Irrigation guidance request failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate irrigation guidance."
    });
  }
};
