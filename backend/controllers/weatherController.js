import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import WeatherHistory from "../models/WeatherHistory.js";
import {
  createWeatherHistoryEntry,
  findFarmByIdAndOwner,
  findFarmPlotById,
  isFallbackMode,
  listWeatherHistoryByFarm
} from "../config/fallbackStore.js";
import {
  getWeatherForCoordinates,
  getWeatherForLocation,
  WeatherProviderError
} from "../services/weatherService.js";

const hasQueryValue = (value) => value !== undefined && value !== "";

const findOwnedFarm = async (farmId, ownerId) => (
  isFallbackMode()
    ? findFarmByIdAndOwner(farmId, ownerId)
    : await Farm.findOne({ _id: farmId, owner: ownerId })
);

const saveWeatherSnapshot = async (ownerId, farm, weather) => {
  const weatherSnapshot = { ...weather };
  delete weatherSnapshot.cacheHit;
  const sourceFetchedAt = new Date(weather.fetchedAt);
  const payload = {
    latitude: weather.location.latitude,
    longitude: weather.location.longitude,
    source: "OpenWeather",
    sourceFetchedAt,
    weather: weatherSnapshot
  };

  if (isFallbackMode()) {
    return createWeatherHistoryEntry(ownerId, farm._id, payload);
  }

  return WeatherHistory.findOneAndUpdate(
    { owner: ownerId, farm: farm._id, sourceFetchedAt },
    { $setOnInsert: { ...payload, owner: ownerId, farm: farm._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

export const getWeather = async (req, res) => {
  const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
  const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
  const farmId = typeof req.query.farmId === "string" ? req.query.farmId.trim() : "";
  const plotId = typeof req.query.plotId === "string" ? req.query.plotId.trim() : "";
  const latitudeProvided = hasQueryValue(req.query.latitude);
  const longitudeProvided = hasQueryValue(req.query.longitude);

  if (state.length > 100 || location.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Farm location and state must be 100 characters or fewer."
    });
  }
  if (latitudeProvided !== longitudeProvided) {
    return res.status(400).json({
      success: false,
      message: "Provide both latitude and longitude."
    });
  }
  if (!farmId && !plotId && !location && !latitudeProvided) {
    return res.status(400).json({
      success: false,
      message: "Provide a farm ID, plot ID, location, or latitude and longitude."
    });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "Weather API key is not configured. Add OPENWEATHER_API_KEY to backend/.env and restart the backend."
    });
  }

  try {
    let plot = null;
    if (plotId) {
      plot = isFallbackMode()
        ? findFarmPlotById(plotId, req.user._id)
        : await FarmPlot.findOne({ _id: plotId, owner: req.user._id });
    }

    const effectiveFarmId = farmId || (plot?.farm ? String(plot.farm) : "");
    const farm = effectiveFarmId ? await findOwnedFarm(effectiveFarmId, req.user._id) : null;
    if (farmId && !farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    let weather;
    if (plot && Number.isFinite(plot.latitude) && Number.isFinite(plot.longitude)) {
      weather = await getWeatherForCoordinates(
        plot.latitude,
        plot.longitude,
        apiKey,
        plot.plotName
      );
    } else if (farm && Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude)) {
      weather = await getWeatherForCoordinates(
        farm.latitude,
        farm.longitude,
        apiKey,
        farm.farmName
      );
    } else if (latitudeProvided) {
      weather = await getWeatherForCoordinates(
        req.query.latitude,
        req.query.longitude,
        apiKey
      );
    } else {
      const weatherLocation = plot?.locationName || farm?.location || location;
      const weatherState = farm?.state || state;
      if (!weatherLocation) {
        return res.status(400).json({
          success: false,
          message: "This farm or plot has no saved coordinates or location for weather lookup."
        });
      }
      weather = await getWeatherForLocation(weatherLocation, weatherState, apiKey);
    }

    if (farm) {
      await saveWeatherSnapshot(req.user._id, farm, weather);
    }

    // Generate intelligent cross-signals
    const temp = weather.current?.temperatureC;
    const humidity = weather.current?.humidityPercent;
    const rainForecast = Array.isArray(weather.forecast)
      ? weather.forecast.reduce((sum, f) => sum + (f.rainMm || 0), 0)
      : 0;

    const crossSignals = {
      irrigationAdvisory: rainForecast >= 1.5
        ? "Postpone irrigation: Forecast indicates upcoming precipitation."
        : "Standard irrigation: Adequate soil moisture check advised.",
      diseaseRisk: (humidity >= 75 && temp >= 20 && temp <= 32)
        ? "Elevated fungal risk: Warm temperature and high humidity favor pathogen development."
        : "Low disease risk from prevailing weather conditions.",
      extremeAlerts: []
    };

    if (temp >= 38) crossSignals.extremeAlerts.push("Heatwave Advisory: Ensure protective mulching and light irrigation.");
    if (weather.current?.windSpeedKmh >= 35) crossSignals.extremeAlerts.push("High Wind Warning: Check field staking and avoid foliar spraying.");

    return res.status(200).json({
      success: true,
      weather,
      crossSignals
    });
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm ID is invalid." });
    }

    console.error("Weather request failed:", error);
    return res.status(502).json({
      success: false,
      message: "Weather data could not be retrieved or saved. Please retry."
    });
  }
};

export const getWeatherHistory = async (req, res) => {
  const farmId = typeof req.query.farmId === "string" ? req.query.farmId.trim() : "";
  if (!farmId) {
    return res.status(400).json({ success: false, message: "Provide a farm ID." });
  }

  try {
    const farm = await findOwnedFarm(farmId, req.user._id);
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }
    const history = isFallbackMode()
      ? listWeatherHistoryByFarm(req.user._id, farmId)
      : await WeatherHistory.find({ owner: req.user._id, farm: farmId })
        .sort({ sourceFetchedAt: -1 })
        .limit(30)
        .lean();
    return res.json({ success: true, history });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, message: "Farm ID is invalid." });
    }
    console.error("Weather history request failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve weather history."
    });
  }
};
