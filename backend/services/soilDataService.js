const SOILGRIDS_ENDPOINT = "https://rest.isric.org/soilgrids/v2.0/properties/query";
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const SOIL_CACHE = new Map();
const DEPTH = "0-5cm";

const PROPERTIES = {
  phh2o: { key: "ph", unit: "pH", conversion: "ph" },
  nitrogen: { key: "nitrogen", unit: "g/kg", conversion: "mass" },
  soc: { key: "organicCarbon", unit: "g/kg", conversion: "mass" },
  clay: { key: "clay", unit: "%", conversion: "texture" },
  sand: { key: "sand", unit: "%", conversion: "texture" },
  silt: { key: "silt", unit: "%", conversion: "texture" },
  cec: { key: "cec", unit: "cmol(c)/kg", conversion: "cec" }
};

export class SoilProviderError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "SoilProviderError";
    this.statusCode = statusCode;
  }
}

export class SoilDataProvider {
  async getProperties() {
    throw new Error("Soil data providers must implement getProperties(latitude, longitude).");
  }
}

const cacheKeyFor = (latitude, longitude) => (
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`
);

const parameterValue = (layer, spec) => {
  const depth = Array.isArray(layer?.depths)
    ? layer.depths.find((item) => item?.label === DEPTH)
    : null;
  const rawValue = depth?.values?.mean;
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;

  const value = Number(rawValue);
  const factor = Number(layer?.unit_measure?.d_factor);
  if (!Number.isFinite(value) || !Number.isFinite(factor) || factor <= 0) {
    throw new SoilProviderError("SoilGrids returned a soil value with invalid unit metadata.");
  }

  const targetUnits = String(layer.unit_measure.target_units || "").toLowerCase();
  const mappedUnits = String(layer.unit_measure.mapped_units || "").toLowerCase();
  let converted = value / factor;

  if (spec.conversion === "texture") {
    if (targetUnits.includes("g/kg")) {
      converted /= 10;
    } else if (!targetUnits.includes("%") && !targetUnits.includes("percent")) {
      throw new SoilProviderError("SoilGrids returned texture data in an unsupported unit.");
    }
  } else if (spec.conversion === "mass" && !targetUnits.includes("g/kg")) {
    throw new SoilProviderError("SoilGrids returned nutrient data in an unsupported unit.");
  } else if (spec.conversion === "cec") {
    if (targetUnits.includes("mmol")) {
      converted /= 10;
    } else if (!targetUnits.includes("cmol")) {
      throw new SoilProviderError("SoilGrids returned CEC data in an unsupported unit.");
    }
  } else if (
    spec.conversion === "ph"
    && !targetUnits.includes("ph")
    && targetUnits !== "-"
    && !mappedUnits.includes("ph")
  ) {
    throw new SoilProviderError("SoilGrids returned pH data in an unsupported unit.");
  }

  return Math.round(converted * 100) / 100;
};

export const normalizeSoilGridsResponse = (payload) => {
  const layers = payload?.properties?.layers;
  if (!Array.isArray(layers)) {
    throw new SoilProviderError("SoilGrids returned an invalid response.");
  }

  const byName = new Map(layers.map((layer) => [layer?.name, layer]));
  const parameters = {};

  for (const [layerName, spec] of Object.entries(PROPERTIES)) {
    const layer = byName.get(layerName);
    let value = null;
    if (layer) value = parameterValue(layer, spec);
    parameters[spec.key] = {
      value,
      unit: spec.unit,
      depth: DEPTH,
      modelled: true
    };
  }

  if (Object.values(parameters).every((parameter) => parameter.value === null)) {
    throw new SoilProviderError(
      "SoilGrids has no estimates for this point. Coverage can be missing in urban or masked areas; try another point in the field or use laboratory results.",
      404
    );
  }

  return {
    parameters,
    missingProperties: Object.entries(parameters)
      .filter(([, parameter]) => parameter.value === null)
      .map(([name]) => name)
  };
};

const requestSoilGrids = async (latitude, longitude, fetchImpl = globalThis.fetch) => {
  const endpoint = process.env.SOILGRIDS_API_URL?.trim() || SOILGRIDS_ENDPOINT;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new SoilProviderError("The configured soil data provider URL is invalid.", 500);
  }

  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("depth", DEPTH);
  url.searchParams.set("value", "mean");
  Object.keys(PROPERTIES).forEach((property) => url.searchParams.append("property", property));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new SoilProviderError("No SoilGrids data is available for these coordinates.", 404);
      }
      if (response.status === 429 || response.status >= 500) {
        throw new SoilProviderError("SoilGrids is temporarily unavailable. Please try again later.", 503);
      }
      throw new SoilProviderError("The soil data provider could not complete this request.", 502);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new SoilProviderError("SoilGrids returned an invalid response.");
    }
    return normalizeSoilGridsResponse(payload);
  } catch (error) {
    if (error instanceof SoilProviderError) throw error;
    if (error?.name === "AbortError") {
      throw new SoilProviderError("The soil data provider timed out. Please retry.", 504);
    }
    throw new SoilProviderError("Could not connect to the soil data provider. Please retry.", 502);
  } finally {
    clearTimeout(timeout);
  }
};

export class SoilGridsProvider extends SoilDataProvider {
  async getProperties(latitude, longitude) {
    return requestSoilGrids(latitude, longitude);
  }
}

const soilGridsProvider = new SoilGridsProvider();

export const getSoilData = async (latitude, longitude, provider = soilGridsProvider) => {
  const key = `${provider.constructor.name}:${cacheKeyFor(latitude, longitude)}`;
  const cached = SOIL_CACHE.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.data, cacheHit: true };
  }

  const data = await provider.getProperties(latitude, longitude);
  if (SOIL_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = SOIL_CACHE.keys().next().value;
    if (oldestKey) SOIL_CACHE.delete(oldestKey);
  }
  SOIL_CACHE.set(key, { data, cachedAt: Date.now() });
  return { ...data, cacheHit: false };
};
