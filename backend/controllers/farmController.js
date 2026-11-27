import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import User from "../models/User.js";
import {
  createFarmEntry,
  createFarmPlotEntry,
  deleteFarmPlotEntry,
  findFarmByIdAndOwner,
  findFarmPlotById,
  getFarmByOwner,
  isFallbackMode,
  listFarmPlots,
  listFarmsByOwner,
  updateFarmEntry,
  updateFarmPlotEntry,
  upsertFarm,
  updateUserLocation
} from "../config/fallbackStore.js";
import { reverseGeocode } from "../services/reverseGeocodeService.js";
import {
  calculateFarmBoundaryAreaSquareMeters,
  FarmInputError,
  normalizeFarmBoundary,
  normalizeFarmCoordinates
} from "../services/farmGeospatialService.js";

const SQUARE_METERS_PER_ACRE = 4046.8564224;
const SQUARE_METERS_PER_HECTARE = 10000;
const irrigationTypes = ["Drip", "Sprinkler", "Flood", "Rainfed", "Other", "Unknown"];

function buildFarmPayload(body) {
  const {
    farmName,
    location,
    state,
    village,
    district,
    city,
    pincode,
    area,
    areaUnit = "acres",
    soilType,
    ph,
    nitrogen,
    phosphorus,
    potassium,
    waterSource,
    irrigationType = "Unknown"
  } = body;

  if (!farmName || !location) {
    throw new FarmInputError("Farm name and location are required.");
  }
  if (!["acres", "hectares"].includes(areaUnit)) {
    throw new FarmInputError("Area unit must be acres or hectares.");
  }
  if (!irrigationTypes.includes(irrigationType)) {
    throw new FarmInputError("Irrigation type is invalid.");
  }

  const coordinates = normalizeFarmCoordinates(body.latitude, body.longitude);
  const boundary = body.boundary == null ? null : normalizeFarmBoundary(body.boundary);
  const areaDivisor = areaUnit === "hectares" ? SQUARE_METERS_PER_HECTARE : SQUARE_METERS_PER_ACRE;
  const parsedArea = boundary
    ? calculateFarmBoundaryAreaSquareMeters(boundary) / areaDivisor
    : Number(area);

  if (!Number.isFinite(parsedArea) || parsedArea < 0.01) {
    throw new FarmInputError("Farm area must be at least 0.01 acres or hectares.");
  }

  return {
    farmName: String(farmName).trim(),
    location: String(location).trim(),
    state: String(state || "Karnataka").trim(),
    village: String(village || location).trim(),
    district: String(district || "").trim(),
    city: String(city || village || location).trim(),
    pincode: String(pincode || "").trim(),
    ...coordinates,
    boundary,
    area: parsedArea,
    areaUnit,
    soilType: soilType || "Other",
    ph: ph === "" || ph == null ? null : Number(ph),
    nitrogen: nitrogen === "" || nitrogen == null ? null : Number(nitrogen),
    phosphorus: phosphorus === "" || phosphorus == null ? null : Number(phosphorus),
    potassium: potassium === "" || potassium == null ? null : Number(potassium),
    waterSource: waterSource || "Unknown",
    irrigationType
  };
}

function buildPlotPayload(body) {
  const plotName = String(body.plotName || "").trim();
  const areaUnit = body.areaUnit || "acres";
  const irrigationType = body.irrigationType || "Unknown";
  if (!plotName) {
    throw new FarmInputError("Plot name is required.");
  }
  if (!["acres", "hectares"].includes(areaUnit)) {
    throw new FarmInputError("Area unit must be acres or hectares.");
  }
  if (!irrigationTypes.includes(irrigationType)) {
    throw new FarmInputError("Irrigation type is invalid.");
  }

  const coordinates = normalizeFarmCoordinates(body.latitude, body.longitude);
  const boundary = body.boundary == null ? null : normalizeFarmBoundary(body.boundary);
  const areaDivisor = areaUnit === "hectares" ? SQUARE_METERS_PER_HECTARE : SQUARE_METERS_PER_ACRE;
  const area = boundary
    ? calculateFarmBoundaryAreaSquareMeters(boundary) / areaDivisor
    : Number(body.area);
  if (!Number.isFinite(area) || area < 0.01) {
    throw new FarmInputError("Plot area must be at least 0.01 acres or hectares.");
  }

  return {
    plotName,
    ...coordinates,
    boundary,
    area,
    areaUnit,
    currentCrop: String(body.currentCrop || "").trim(),
    soilType: String(body.soilType || "Medium Black").trim(),
    previousCrops: Array.isArray(body.previousCrops)
      ? body.previousCrops.map(String)
      : (body.previousCrops ? [String(body.previousCrops).trim()] : []),
    locationName: String(body.locationName || "").trim(),
    farmingHistory: Array.isArray(body.farmingHistory) ? body.farmingHistory : [],
    irrigationType
  };
}

function sendControllerError(res, error, fallbackMessage) {
  if (error instanceof FarmInputError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Farm or plot ID is invalid." });
  }
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Farm storage still has the legacy one-farm-per-owner index. Run npm run migrate:farms before adding another farm."
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

export const saveFarm = async (req, res) => {
  try {
    const payload = buildFarmPayload(req.body);
    const farmId = req.body.farmId;
    const createNew = req.body.createNew === true;
    let farm;

    if (isFallbackMode()) {
      if (farmId) {
        farm = updateFarmEntry(farmId, req.user._id, payload);
        if (!farm) {
          return res.status(404).json({ success: false, message: "Farm not found." });
        }
      } else if (createNew) {
        farm = createFarmEntry(req.user._id, payload);
      } else {
        farm = upsertFarm(req.user._id, payload);
      }
    } else if (farmId) {
      farm = await Farm.findOneAndUpdate(
        { _id: farmId, owner: req.user._id },
        payload,
        { new: true, runValidators: true }
      );
      if (!farm) {
        return res.status(404).json({ success: false, message: "Farm not found." });
      }
    } else if (createNew) {
      farm = await Farm.create({ ...payload, owner: req.user._id });
    } else {
      const existingFarm = await Farm.findOne({ owner: req.user._id }).sort({ createdAt: 1 });
      farm = existingFarm
        ? await Farm.findOneAndUpdate(
          { _id: existingFarm._id, owner: req.user._id },
          payload,
          { new: true, runValidators: true }
        )
        : await Farm.create({ ...payload, owner: req.user._id });
    }

    // Synchronize location to user profile
    const userLocation = {
      state: payload.state,
      district: payload.district,
      village: payload.village,
      city: payload.city,
      pincode: payload.pincode,
      latitude: payload.latitude,
      longitude: payload.longitude
    };
    if (isFallbackMode()) {
      updateUserLocation(req.user._id, userLocation);
    } else {
      await User.findByIdAndUpdate(req.user._id, userLocation).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Farm profile saved successfully.",
      farm
    });
  } catch (error) {
    return sendControllerError(res, error, "Could not save farm profile.");
  }
};

export const getMyFarm = async (req, res) => {
  try {
    const farm = isFallbackMode()
      ? getFarmByOwner(req.user._id)
      : await Farm.findOne({ owner: req.user._id }).sort({ createdAt: 1 });

    return res.json({ success: true, farm });
  } catch (error) {
    return sendControllerError(res, error, "Could not retrieve farm information.");
  }
};

export const getMyFarms = async (req, res) => {
  try {
    const farms = isFallbackMode()
      ? listFarmsByOwner(req.user._id)
      : await Farm.find({ owner: req.user._id }).sort({ createdAt: 1 });

    return res.json({ success: true, farms });
  } catch (error) {
    return sendControllerError(res, error, "Could not retrieve farms.");
  }
};

async function findOwnedFarm(farmId, ownerId) {
  return isFallbackMode()
    ? findFarmByIdAndOwner(farmId, ownerId)
    : await Farm.findOne({ _id: farmId, owner: ownerId });
}

export const getFarmPlots = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const plots = isFallbackMode()
      ? listFarmPlots(req.params.farmId, req.user._id)
      : await FarmPlot.find({ farm: req.params.farmId, owner: req.user._id }).sort({ createdAt: 1 });
    return res.json({ success: true, plots });
  } catch (error) {
    return sendControllerError(res, error, "Could not retrieve farm plots.");
  }
};

export const createFarmPlot = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const payload = buildPlotPayload(req.body);
    const plot = isFallbackMode()
      ? createFarmPlotEntry(req.user._id, req.params.farmId, payload)
      : await FarmPlot.create({
        ...payload,
        owner: req.user._id,
        farm: req.params.farmId
      });
    return res.status(201).json({ success: true, plot });
  } catch (error) {
    return sendControllerError(res, error, "Could not save farm plot.");
  }
};

export const updateFarmPlot = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const plot = isFallbackMode()
      ? listFarmPlots(req.params.farmId, req.user._id)
        .find((item) => String(item._id) === String(req.params.plotId))
      : await FarmPlot.findOne({
        _id: req.params.plotId,
        farm: req.params.farmId,
        owner: req.user._id
      });
    if (!plot) {
      return res.status(404).json({ success: false, message: "Plot not found." });
    }

    const existingPlot = typeof plot.toObject === "function" ? plot.toObject() : plot;
    const payload = buildPlotPayload({ ...existingPlot, ...req.body });
    const updatedPlot = isFallbackMode()
      ? updateFarmPlotEntry(req.params.plotId, req.params.farmId, req.user._id, payload)
      : await FarmPlot.findOneAndUpdate(
        { _id: req.params.plotId, farm: req.params.farmId, owner: req.user._id },
        payload,
        { new: true, runValidators: true }
      );
    return res.json({ success: true, plot: updatedPlot });
  } catch (error) {
    return sendControllerError(res, error, "Could not update farm plot.");
  }
};

export const getFarmPlotById = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const plot = isFallbackMode()
      ? listFarmPlots(req.params.farmId, req.user._id)
        .find((item) => String(item._id) === String(req.params.plotId))
      : await FarmPlot.findOne({
        _id: req.params.plotId,
        farm: req.params.farmId,
        owner: req.user._id
      });

    if (!plot) {
      return res.status(404).json({ success: false, message: "Plot not found or access denied." });
    }

    return res.status(200).json({ success: true, plot });
  } catch (error) {
    return sendControllerError(res, error, "Could not retrieve plot details.");
  }
};

export const deleteFarmPlot = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    let deleted = false;
    if (isFallbackMode()) {
      deleted = deleteFarmPlotEntry(req.params.plotId, req.params.farmId, req.user._id);
    } else {
      const result = await FarmPlot.findOneAndDelete({
        _id: req.params.plotId,
        farm: req.params.farmId,
        owner: req.user._id
      });
      deleted = Boolean(result);
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Plot not found or unauthorized to delete." });
    }

    return res.status(200).json({
      success: true,
      message: "Plot deleted successfully."
    });
  } catch (error) {
    return sendControllerError(res, error, "Could not delete farm plot.");
  }
};

export const reverseGeocodeFarm = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Provide both latitude and longitude query parameters."
      });
    }
    const result = await reverseGeocode(latitude, longitude);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
