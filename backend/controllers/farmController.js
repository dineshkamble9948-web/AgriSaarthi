import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import {
  createFarmEntry,
  createFarmPlotEntry,
  findFarmByIdAndOwner,
  getFarmByOwner,
  isFallbackMode,
  listFarmPlots,
  listFarmsByOwner,
  updateFarmEntry,
  updateFarmPlotEntry,
  upsertFarm
} from "../config/fallbackStore.js";
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
