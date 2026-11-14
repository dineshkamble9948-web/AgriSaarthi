const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const REQUEST_TIMEOUT_MS = 8000;
const weatherCache = new Map();

export class WeatherProviderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "WeatherProviderError";
    this.statusCode = statusCode;
  }
}

const toIsoString = (unixSeconds) => (
  Number.isFinite(unixSeconds) ? new Date(unixSeconds * 1000).toISOString() : null
);

const conditionFrom = (weather) => ({
  main: weather?.main || "Unknown",
  description: weather?.description || "Condition unavailable",
  icon: weather?.icon || null
});

const fetchProviderJson = async (url, requestType) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const apiName = requestType === "geocoding"
          ? "location lookup"
          : `the standard ${requestType} API`;
        const message = response.status === 401
          ? `OpenWeather rejected the API key for ${apiName}. Confirm it is active and configured correctly.`
          : `OpenWeather denied access to ${apiName}.`;
        throw new WeatherProviderError(
          message,
          502
        );
      }
      if (response.status === 429) {
        throw new WeatherProviderError("The weather provider rate limit was reached. Please retry later.", 503);
      }
      throw new WeatherProviderError("The weather provider could not complete the request.", 502);
    }

    return payload;
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      throw error;
    }
    if (error.name === "AbortError") {
      throw new WeatherProviderError("The weather provider timed out. Please retry.", 504);
    }
    throw new WeatherProviderError("Could not connect to the weather provider. Please retry.", 502);
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeWeather = (place, current, forecast) => {
  const entries = forecast.list;
  const timezoneOffsetSeconds = Number.isFinite(forecast.city?.timezone)
    ? forecast.city.timezone
    : Number.isFinite(current.timezone)
      ? current.timezone
      : 0;
  const dailyGroups = new Map();

  entries.forEach((entry) => {
    if (!Number.isFinite(entry.dt)) {
      return;
    }

    const localDate = new Date((entry.dt + timezoneOffsetSeconds) * 1000)
      .toISOString()
      .slice(0, 10);
    const dayEntries = dailyGroups.get(localDate) || [];
    dayEntries.push(entry);
    dailyGroups.set(localDate, dayEntries);
  });

  const daily = Array.from(dailyGroups.values()).slice(0, 5).map((dayEntries) => {
    const representative = dayEntries.reduce((best, entry) => (
      Number(entry.pop || 0) > Number(best.pop || 0) ? entry : best
    ), dayEntries[0]);
    const temperatures = dayEntries
      .map((entry) => entry.main?.temp)
      .filter(Number.isFinite);

    return {
      date: toIsoString(dayEntries[0].dt),
      temperatureMaxC: temperatures.length ? Math.max(...temperatures) : null,
      temperatureMinC: temperatures.length ? Math.min(...temperatures) : null,
      precipitationProbabilityPercent: Number.isFinite(representative.pop)
        ? Math.round(representative.pop * 100)
        : null,
      rainfallMm: dayEntries.reduce((total, entry) => total + (entry.rain?.["3h"] || 0), 0),
      condition: conditionFrom(representative.weather?.[0])
    };
  });

  return {
    source: "OpenWeather Current Weather and 5-day/3-hour Forecast",
    fetchedAt: new Date().toISOString(),
    location: {
      name: place.name,
      region: place.state || place.country || "",
      country: place.country || "",
      latitude: place.lat,
      longitude: place.lon,
      timezoneOffsetSeconds
    },
    current: {
      temperatureC: current.main?.temp ?? null,
      feelsLikeC: current.main?.feels_like ?? null,
      humidityPercent: current.main?.humidity ?? null,
      windSpeedKph: Number.isFinite(current.wind?.speed)
        ? Math.round(current.wind.speed * 3.6 * 10) / 10
        : null,
      windDirectionDegrees: current.wind?.deg ?? null,
      rainfallLastHourMm: current.rain?.["1h"] ?? 0,
      pressureHPa: current.main?.pressure ?? null,
      uvIndex: null,
      condition: conditionFrom(current.weather?.[0]),
      observedAt: toIsoString(current.dt),
      sunriseAt: toIsoString(current.sys?.sunrise),
      sunsetAt: toIsoString(current.sys?.sunset)
    },
    hourly: entries.slice(0, 8).map((entry) => ({
      time: toIsoString(entry.dt),
      temperatureC: entry.main?.temp ?? null,
      precipitationProbabilityPercent: Number.isFinite(entry.pop)
        ? Math.round(entry.pop * 100)
        : null,
      rainfallMm: entry.rain?.["3h"] ?? 0,
      condition: conditionFrom(entry.weather?.[0])
    })),
    daily,
    alerts: []
  };
};

export const getWeatherForLocation = async (location, state, apiKey) => {
  const search = [location, state].filter(Boolean).join(", ");
  const cacheKey = search.toLocaleLowerCase();
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.weather, cacheHit: true };
  }

  const geocodingParams = new URLSearchParams({
    q: search,
    limit: "1",
    appid: apiKey
  });
  const places = await fetchProviderJson(
    `https://api.openweathermap.org/geo/1.0/direct?${geocodingParams.toString()}`,
    "geocoding"
  );
  if (!Array.isArray(places)) {
    throw new WeatherProviderError("The weather provider returned invalid location data.", 502);
  }
  const place = places[0];

  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    throw new WeatherProviderError("Could not find coordinates for the farm location.", 404);
  }

  const weatherParams = new URLSearchParams({
    lat: String(place.lat),
    lon: String(place.lon),
    units: "metric",
    appid: apiKey
  });
  const current = await fetchProviderJson(
    `https://api.openweathermap.org/data/2.5/weather?${weatherParams.toString()}`,
    "current weather"
  );
  const forecast = await fetchProviderJson(
    `https://api.openweathermap.org/data/2.5/forecast?${weatherParams.toString()}`,
    "5-day forecast"
  );

  if (!current?.main || !Array.isArray(current.weather)) {
    throw new WeatherProviderError("The weather provider returned incomplete current conditions.", 502);
  }
  if (!forecast?.city || !Array.isArray(forecast.list) || forecast.list.length === 0) {
    throw new WeatherProviderError("The weather provider returned incomplete forecast data.", 502);
  }

  const weather = normalizeWeather(place, current, forecast);

  if (weatherCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = weatherCache.keys().next().value;
    if (oldestKey) {
      weatherCache.delete(oldestKey);
    }
  }
  weatherCache.set(cacheKey, { weather, cachedAt: Date.now() });

  return { ...weather, cacheHit: false };
};
