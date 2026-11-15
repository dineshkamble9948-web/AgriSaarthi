import CropCycle from "../models/CropCycle.js";
import Farm from "../models/Farm.js";
import FarmAlert from "../models/FarmAlert.js";
import SatelliteMonitoring from "../models/SatelliteMonitoring.js";
import WeatherHistory from "../models/WeatherHistory.js";
import {
  acknowledgeFarmAlertEntry,
  deactivateFarmAlerts,
  findFarmByIdAndOwner,
  isFallbackMode,
  listCropCyclesByFarm,
  listFarmAlerts,
  listSatelliteMonitoringByFarm,
  listWeatherHistoryByFarm,
  upsertFarmAlert
} from "../config/fallbackStore.js";
import { withCropStageEstimate } from "../services/cropLifecycleService.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const findOwnedFarm = async (farmId, ownerId) => (
  isFallbackMode()
    ? findFarmByIdAndOwner(farmId, ownerId)
    : await Farm.findOne({ _id: farmId, owner: ownerId })
);

const collectCurrentAlerts = ({ weatherSnapshot, satelliteSnapshot, cropCycles, ownerId, farmId, now }) => {
  const alerts = [];
  const weatherTime = weatherSnapshot?.sourceFetchedAt
    ? new Date(weatherSnapshot.sourceFetchedAt)
    : null;
  if (
    weatherSnapshot
    && weatherTime
    && now - weatherTime <= DAY_MS
  ) {
    for (const alert of weatherSnapshot.weather?.alerts || []) {
      alerts.push({
        type: alert.type,
        severity: ["info", "warning", "critical"].includes(alert.severity)
          ? alert.severity
          : "caution",
        title: alert.title,
        message: alert.message,
        source: "OpenWeather forecast",
        sourceReference: `weather:${weatherTime.toISOString()}:${alert.type}`,
        observedAt: weatherTime,
        evidence: { sourceFetchedAt: weatherTime }
      });
    }
  }

  const satelliteTime = satelliteSnapshot?.latestObservation
    ? new Date(satelliteSnapshot.latestObservation)
    : null;
  if (
    satelliteSnapshot?.classification === "poor"
    && satelliteTime
    && now - satelliteTime <= 30 * DAY_MS
  ) {
    alerts.push({
      plot: satelliteSnapshot.plot || null,
      type: "low_vegetation",
      severity: "warning",
      title: "Low vegetation index",
      message: "Recent Sentinel-2 NDVI is in the generic low range. Inspect the crop and field; this is not a diagnosis.",
      source: "Sentinel-2 NDVI",
      sourceReference: `satellite:${satelliteSnapshot.plot || "farm"}:${satelliteTime.toISOString()}`,
      observedAt: satelliteTime,
      evidence: {
        latestNDVI: satelliteSnapshot.latestNDVI,
        classification: satelliteSnapshot.classification,
        classificationNote: satelliteSnapshot.classificationNote
      }
    });
  }

  const activeCycle = cropCycles
    .map((cycle) => withCropStageEstimate(cycle, now))
    .find((cycle) => (
      !cycle.actualHarvestDate
      && new Date(cycle.sowingDate) <= now
      && new Date(cycle.expectedHarvestDate) >= now
      && cycle.progressPercent >= 90
    ));
  if (activeCycle) {
    alerts.push({
      plot: activeCycle.plot || null,
      type: "crop_milestone",
      severity: "info",
      title: "Expected harvest window approaching",
      message: `${activeCycle.cropName} is near its farmer-entered expected harvest date.`,
      source: "Farmer-entered crop dates",
      sourceReference: `crop:${activeCycle._id}:harvest-window`,
      observedAt: now,
      evidence: {
        cropName: activeCycle.cropName,
        expectedHarvestDate: activeCycle.expectedHarvestDate,
        progressPercent: activeCycle.progressPercent,
        stageSource: activeCycle.stageSource
      }
    });
  }

  return alerts.map((alert) => ({
    owner: ownerId,
    farm: farmId,
    ...alert
  }));
};

export const getFarmAlerts = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const [weatherHistory, satelliteHistory, cropCycles] = await Promise.all([
      isFallbackMode()
        ? listWeatherHistoryByFarm(req.user._id, req.params.farmId, 1)
        : WeatherHistory.find({ owner: req.user._id, farm: req.params.farmId })
          .sort({ sourceFetchedAt: -1 }).limit(1).lean(),
      isFallbackMode()
        ? listSatelliteMonitoringByFarm(req.user._id, req.params.farmId, null, 1)
        : SatelliteMonitoring.find({ owner: req.user._id, farm: req.params.farmId })
          .sort({ retrievedAt: -1 }).limit(1).lean(),
      isFallbackMode()
        ? listCropCyclesByFarm(req.params.farmId, req.user._id)
        : CropCycle.find({ owner: req.user._id, farm: req.params.farmId }).sort({ sowingDate: -1 }).lean()
    ]);

    const generatedAlerts = collectCurrentAlerts({
      weatherSnapshot: weatherHistory[0],
      satelliteSnapshot: satelliteHistory[0],
      cropCycles,
      ownerId: req.user._id,
      farmId: farm._id,
      now: new Date()
    });

    let alerts;
    if (isFallbackMode()) {
      deactivateFarmAlerts(req.user._id, farm._id);
      generatedAlerts.forEach((alert) => upsertFarmAlert(req.user._id, farm._id, alert));
      alerts = listFarmAlerts(req.user._id, farm._id, true);
    } else {
      await FarmAlert.updateMany(
        { owner: req.user._id, farm: farm._id },
        { $set: { active: false } }
      );
      await Promise.all(generatedAlerts.map((alert) => FarmAlert.findOneAndUpdate(
        {
          owner: req.user._id,
          farm: farm._id,
          type: alert.type,
          sourceReference: alert.sourceReference
        },
        { $set: { ...alert, active: true } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      )));
      alerts = await FarmAlert.find({ owner: req.user._id, farm: farm._id, active: true })
        .sort({ observedAt: -1 })
        .limit(30)
        .lean();
    }

    return res.json({ success: true, alerts });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm ID is invalid." });
    }
    console.error("Farm alerts request failed:", error);
    return res.status(500).json({ success: false, message: "Could not retrieve farm alerts." });
  }
};

export const acknowledgeFarmAlert = async (req, res) => {
  try {
    const farm = await findOwnedFarm(req.params.farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    const alert = isFallbackMode()
      ? acknowledgeFarmAlertEntry(req.params.alertId, req.user._id, farm._id)
      : await FarmAlert.findOneAndUpdate(
        {
          _id: req.params.alertId,
          owner: req.user._id,
          farm: farm._id,
          active: true
        },
        { $set: { acknowledgedAt: new Date() } },
        { new: true }
      );
    if (!alert) {
      return res.status(404).json({ success: false, message: "Active farm alert not found." });
    }
    return res.json({ success: true, alert });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm or alert ID is invalid." });
    }
    console.error("Farm alert acknowledgement failed:", error);
    return res.status(500).json({ success: false, message: "Could not acknowledge the farm alert." });
  }
};
