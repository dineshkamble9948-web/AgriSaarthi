import Farm from "../models/Farm.js";
import WeatherHistory from "../models/WeatherHistory.js";
import {
  createWeatherHistoryEntry,
  findFarmByIdAndOwner,
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
  if (!farmId && !location && !latitudeProvided) {
    return res.status(400).json({
      success: false,
      message: "Provide a farm ID, location, or latitude and longitude."
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
    const farm = farmId ? await findOwnedFarm(farmId, req.user._id) : null;
    if (farmId && !farm) {
      return res.status(404).json({ success: false, message: "Farm not found." });
    }

    let weather;
    if (farm && Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude)) {
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
      const weatherLocation = farm?.location || location;
      const weatherState = farm?.state || state;
      if (!weatherLocation) {
        return res.status(400).json({
          success: false,
          message: "This farm has no saved coordinates or location for weather lookup."
        });
      }
      weather = await getWeatherForLocation(weatherLocation, weatherState, apiKey);
    }

    if (farm) {
      await saveWeatherSnapshot(req.user._id, farm, weather);
    }
    return res.status(200).json({ success: true, weather });
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
