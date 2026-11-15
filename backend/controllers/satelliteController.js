import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import SatelliteMonitoring from "../models/SatelliteMonitoring.js";
import {
  findFarmByIdAndOwner,
  isFallbackMode,
  listFarmPlots,
  listSatelliteMonitoringByFarm,
  saveSatelliteMonitoringEntry
} from "../config/fallbackStore.js";
import {
  defaultMonitoringPeriod,
  getSentinelMonitoring,
  SatelliteProviderError,
  satelliteGeometryForFarm
} from "../services/satelliteMonitoringService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const findOwnedFarm = async (farmId, ownerId) => (
  isFallbackMode()
    ? findFarmByIdAndOwner(farmId, ownerId)
    : await Farm.findOne({ _id: farmId, owner: ownerId })
);

const resolvePeriod = (query) => {
  if (query.from === undefined && query.to === undefined) {
    return defaultMonitoringPeriod();
  }
  if (typeof query.from !== "string" || typeof query.to !== "string") {
    return { error: "Provide both from and to dates in ISO format." };
  }

  const from = new Date(query.from);
  const to = new Date(query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return { error: "Satellite date range is invalid; to must be after from." };
  }
  if (to - from > 365 * DAY_MS) {
    return { error: "Satellite monitoring date range cannot exceed 365 days." };
  }
  return { from: from.toISOString(), to: to.toISOString() };
};

const ownedPlot = async (farmId, plotId, ownerId) => (
  isFallbackMode()
    ? listFarmPlots(farmId, ownerId).find((plot) => String(plot._id) === String(plotId))
    : await FarmPlot.findOne({ _id: plotId, farm: farmId, owner: ownerId })
);

const toSnapshot = (ownerId, farmId, plotId, monitoring) => ({
  owner: ownerId,
  farm: farmId,
  plot: plotId || null,
  source: monitoring.source,
  areaSource: monitoring.areaSource,
  period: {
    from: new Date(monitoring.period.from),
    to: new Date(monitoring.period.to)
  },
  retrievedAt: new Date(monitoring.retrievedAt),
  latestObservation: new Date(monitoring.latestObservation),
  latestNDVI: monitoring.latestNDVI,
  classification: monitoring.classification,
  classificationNote: monitoring.classificationNote,
  imageryStatus: monitoring.imagery.status,
  ndviSeries: monitoring.ndviSeries.map((item) => ({
    date: new Date(item.date),
    intervalEnd: item.intervalEnd ? new Date(item.intervalEnd) : null,
    mean: item.mean,
    validPixelCount: item.validPixelCount
  }))
});

export const getSatelliteMonitoringForFarm = async (req, res) => {
  const plotId = typeof req.query.plotId === "string" ? req.query.plotId.trim() : "";
  const period = resolvePeriod(req.query);
  if (period.error) {
    return res.status(400).json({ success: false, message: period.error });
  }
  if (plotId.length > 100) {
    return res.status(400).json({ success: false, message: "plotId is invalid." });
  }

  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const plot = plotId ? await ownedPlot(req.params.farmId, plotId, req.user._id) : null;
    if (plotId && !plot) {
      return res.status(404).json({ success: false, message: "Plot not found for this farm." });
    }

    const area = satelliteGeometryForFarm(farm, plot);
    const monitoring = await getSentinelMonitoring({
      ...area,
      period
    });
    const snapshot = toSnapshot(req.user._id, req.params.farmId, plotId, monitoring);
    if (isFallbackMode()) {
      saveSatelliteMonitoringEntry(
        req.user._id,
        req.params.farmId,
        plotId,
        snapshot
      );
    } else {
      await SatelliteMonitoring.findOneAndUpdate(
        {
          owner: req.user._id,
          farm: req.params.farmId,
          plot: plotId || null,
          "period.from": snapshot.period.from,
          "period.to": snapshot.period.to
        },
        { $set: snapshot },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }

    return res.json({ success: true, monitoring });
  } catch (error) {
    if (error instanceof SatelliteProviderError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm or plot ID is invalid." });
    }
    console.error("Satellite monitoring request failed:", error);
    return res.status(500).json({
      success: false,
      message: "Satellite monitoring could not be retrieved or stored."
    });
  }
};

export const getSatelliteHistoryForFarm = async (req, res) => {
  const plotId = typeof req.query.plotId === "string" ? req.query.plotId.trim() : "";
  if (plotId.length > 100) {
    return res.status(400).json({ success: false, message: "plotId is invalid." });
  }

  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }
    if (plotId && !(await ownedPlot(req.params.farmId, plotId, req.user._id))) {
      return res.status(404).json({ success: false, message: "Plot not found for this farm." });
    }

    const history = isFallbackMode()
      ? listSatelliteMonitoringByFarm(req.user._id, req.params.farmId, plotId || null)
      : await SatelliteMonitoring.find({
        owner: req.user._id,
        farm: req.params.farmId,
        ...(plotId ? { plot: plotId } : {})
      })
        .sort({ retrievedAt: -1 })
        .limit(30)
        .lean();
    return res.json({ success: true, history });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm or plot ID is invalid." });
    }
    console.error("Satellite history request failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve satellite monitoring history."
    });
  }
};
