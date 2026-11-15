import CropCycle from "../models/CropCycle.js";
import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import {
  createCropCycleEntry,
  findFarmByIdAndOwner,
  isFallbackMode,
  listCropCyclesByFarm,
  listFarmPlots,
  updateCropCycleEntry
} from "../config/fallbackStore.js";
import {
  buildCropCycleFields,
  withCropStageEstimate
} from "../services/cropLifecycleService.js";

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

const handleError = (res, error, message) => {
  if (error?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Farm, plot, or crop cycle ID is invalid." });
  }
  console.error(message, error);
  return res.status(500).json({ success: false, message });
};

const serializeCycle = (cycle) => {
  const value = typeof cycle.toObject === "function" ? cycle.toObject() : cycle;
  return withCropStageEstimate(value);
};

export const getCropCycles = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const cycles = isFallbackMode()
      ? listCropCyclesByFarm(req.params.farmId, req.user._id)
      : await CropCycle.find({ farm: req.params.farmId, owner: req.user._id })
        .sort({ sowingDate: -1 })
        .lean();
    return res.json({ success: true, cycles: cycles.map(serializeCycle) });
  } catch (error) {
    return handleError(res, error, "Could not retrieve crop cycles.");
  }
};

export const createCropCycle = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const result = buildCropCycleFields(req.body);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    if (req.body.plotId) {
      if (typeof req.body.plotId !== "string" || req.body.plotId.length > 100) {
        return res.status(400).json({ success: false, message: "plotId is invalid." });
      }
      const plot = await findOwnedPlot(req.params.farmId, req.body.plotId, req.user._id);
      if (!plot) {
        return res.status(404).json({ success: false, message: "Plot not found for this farm." });
      }
    }

    const cycle = isFallbackMode()
      ? createCropCycleEntry(req.user._id, req.params.farmId, {
        ...result.value,
        plot: req.body.plotId || null
      })
      : await CropCycle.create({
        ...result.value,
        owner: req.user._id,
        farm: req.params.farmId,
        plot: req.body.plotId || null
      });
    return res.status(201).json({ success: true, cycle: serializeCycle(cycle) });
  } catch (error) {
    return handleError(res, error, "Could not save crop cycle.");
  }
};

export const updateCropCycle = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const cycle = isFallbackMode()
      ? listCropCyclesByFarm(req.params.farmId, req.user._id)
        .find((item) => String(item._id) === String(req.params.cycleId))
      : await CropCycle.findOne({
        _id: req.params.cycleId,
        farm: req.params.farmId,
        owner: req.user._id
      });
    if (!cycle) {
      return res.status(404).json({ success: false, message: "Crop cycle not found." });
    }

    const existing = typeof cycle.toObject === "function" ? cycle.toObject() : cycle;
    const result = buildCropCycleFields(req.body, existing);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    const plotId = req.body.plotId === undefined ? existing.plot : req.body.plotId;
    if (plotId) {
      if (typeof plotId !== "string" && typeof plotId !== "object") {
        return res.status(400).json({ success: false, message: "plotId is invalid." });
      }
      const plot = await findOwnedPlot(req.params.farmId, String(plotId), req.user._id);
      if (!plot) {
        return res.status(404).json({ success: false, message: "Plot not found for this farm." });
      }
    }

    const updates = { ...result.value, plot: plotId || null };
    const updated = isFallbackMode()
      ? updateCropCycleEntry(req.params.cycleId, req.params.farmId, req.user._id, updates)
      : await CropCycle.findOneAndUpdate(
        { _id: req.params.cycleId, farm: req.params.farmId, owner: req.user._id },
        updates,
        { new: true, runValidators: true }
      );
    return res.json({ success: true, cycle: serializeCycle(updated) });
  } catch (error) {
    return handleError(res, error, "Could not update crop cycle.");
  }
};
