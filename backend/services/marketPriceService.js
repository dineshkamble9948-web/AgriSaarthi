import axios from "axios";
import MarketPriceCache from "../models/MarketPriceCache.js";
import { isFallbackMode } from "../config/fallbackStore.js";

const API_BASE_URL = "https://mandi-api.onrender.com/v1";
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const OPTIONS_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_MEMORY_CACHE_ENTRIES = 50;
const SUPPORTED_STATES = [
  "Maharashtra",
  "Uttar Pradesh",
  "Punjab",
  "Madhya Pradesh",
  "Karnataka"
];
const memoryCache = new Map();
const optionsCache = new Map();

export class MandiApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "MandiApiError";
    this.statusCode = statusCode;
  }
}

const textValue = (value) => (
  value === undefined || value === null ? "" : String(value).trim()
);

const priceValue = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePriceRecord = (record) => ({
  state: textValue(record.state),
  district: textValue(record.district),
  market: textValue(record.market),
  commodity: textValue(record.commodity),
  variety: textValue(record.variety),
  grade: textValue(record.grade),
  arrivalDate: textValue(record.arrival_date ?? record.arrivalDate),
  minPrice: priceValue(record.min_price ?? record.minPrice),
  maxPrice: priceValue(record.max_price ?? record.maxPrice),
  modalPrice: priceValue(record.modal_price ?? record.modalPrice),
  fetchedAt: textValue(record.fetched_at ?? record.fetchedAt),
  dataPoints: priceValue(record.data_points ?? record.dataPoints)
});

const responseData = (response, endpoint) => {
  const payload = response?.data;
  if (
    !payload
    || payload.success !== true
    || !Array.isArray(payload.data)
  ) {
    throw new MandiApiError(
      `The Mandi Price API returned an unexpected response for ${endpoint}.`,
      502
    );
  }

  return payload;
};

const mapRequestError = (error) => {
  const status = error.response?.status;
  if (status === 429) {
    return new MandiApiError(
      "The Mandi Price API request limit has been reached. Please wait a few minutes and retry.",
      503
    );
  }
  if (status === 400 || status === 422) {
    return new MandiApiError(
      "The Mandi Price API could not apply these filters. Check the crop, state, and mandi selections.",
      400
    );
  }
  if (status) {
    return new MandiApiError(
      "The Mandi Price API is temporarily unavailable. Please try again.",
      status >= 500 ? 502 : 503
    );
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new MandiApiError(
      "The Mandi Price API request timed out. Please try again.",
      504
    );
  }
  return new MandiApiError(
    "Could not connect to the Mandi Price API. Please try again.",
    502
  );
};

const request = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      params,
      timeout: REQUEST_TIMEOUT_MS
    });
    return responseData(response, endpoint);
  } catch (error) {
    if (error instanceof MandiApiError) throw error;
    if (axios.isAxiosError(error)) throw mapRequestError(error);
    throw error;
  }
};

const cacheKeyFor = (kind, filters) => (
  `${kind}:${JSON.stringify(filters)}`
);

const readSnapshot = async (cacheKey) => {
  if (isFallbackMode()) return memoryCache.get(cacheKey) || null;

  try {
    return await MarketPriceCache.findOne({ cacheKey }).lean();
  } catch (error) {
    console.error("Market price cache read failed:", error);
    return null;
  }
};

const writeSnapshot = async (cacheKey, records, fetchedAt) => {
  const snapshot = {
    cacheKey,
    records,
    fetchedAt,
    cachedAt: new Date()
  };

  if (isFallbackMode()) {
    if (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
    memoryCache.set(cacheKey, snapshot);
    return "";
  }

  try {
    await MarketPriceCache.findOneAndUpdate(
      { cacheKey },
      { $set: snapshot },
      { upsert: true, new: true, runValidators: true }
    );
    return "";
  } catch (error) {
    console.error("Market price cache write failed:", error);
    return "Prices were loaded, but could not be saved to the database cache.";
  }
};

const fetchCachedRecords = async (
  kind,
  filters,
  endpoint,
  normalizeRecord = normalizePriceRecord
) => {
  const cacheKey = cacheKeyFor(kind, filters);
  const cached = await readSnapshot(cacheKey);
  const cachedAt = cached?.cachedAt ? new Date(cached.cachedAt).getTime() : 0;
  const isFresh = Number.isFinite(cachedAt) && Date.now() - cachedAt < CACHE_TTL_MS;
  const cachedRecords = Array.isArray(cached?.records)
    ? cached.records
      .filter((record) => record && typeof record === "object" && !Array.isArray(record))
      .map(normalizeRecord)
    : [];
  const cachedAtIso = Number.isFinite(cachedAt) ? new Date(cachedAt).toISOString() : "";

  if (cached && isFresh) {
    return {
      records: cachedRecords,
      fetchedAt: textValue(cached.fetchedAt),
      cachedAt: cachedAtIso,
      cacheHit: true,
      stale: false,
      cacheWarning: ""
    };
  }

  try {
    const payload = await request(endpoint, filters);
    const records = payload.data
      .filter((record) => record && typeof record === "object" && !Array.isArray(record))
      .map(normalizeRecord);
    const fetchedAt = textValue(payload.meta?.latest_fetched_at)
      || records.find((record) => record.fetchedAt)?.fetchedAt
      || new Date().toISOString();
    const cacheWarning = await writeSnapshot(cacheKey, records, fetchedAt);

    return {
      records,
      fetchedAt,
      cachedAt: new Date().toISOString(),
      cacheHit: false,
      stale: false,
      cacheWarning
    };
  } catch (error) {
    if (cached) {
      return {
        records: cachedRecords,
        fetchedAt: textValue(cached.fetchedAt),
        cachedAt: cachedAtIso,
        cacheHit: true,
        stale: true,
        cacheWarning: "The Mandi Price API is unavailable. Showing previously cached prices."
      };
    }
    throw error;
  }
};

const filterDistrict = (records, district) => {
  let filtered = records;
  if (district) {
    const normalizedDistrict = district.toLocaleLowerCase();
    filtered = filtered.filter((record) => (
      textValue(record.district).toLocaleLowerCase() === normalizedDistrict
    ));
  }
  return filtered;
};

const filterMarket = (records, market) => {
  if (!market) return records;
  const normalizedMarket = market.toLocaleLowerCase();
  return records.filter((record) => (
    textValue(record.market).toLocaleLowerCase() === normalizedMarket
  ));
};

export const getMandiPrices = async ({ state, commodity, market, date, district }) => {
  const filters = {};
  if (state) filters.state = state;
  if (commodity) filters.commodity = commodity;
  if (market) filters.market = market;
  if (date) filters.date = date;
  if (!filters.state && !filters.commodity) {
    throw new MandiApiError("Choose a state or enter a crop before searching.", 400);
  }

  const snapshot = await fetchCachedRecords("prices", filters, "/prices");
  const records = filterMarket(filterDistrict(snapshot.records, district), market);

  return {
    records,
    total: records.length,
    fetchedAt: snapshot.fetchedAt,
    cacheHit: snapshot.cacheHit,
    stale: snapshot.stale,
    cacheWarning: snapshot.cacheWarning
  };
};

const loadOptions = async (cacheKey, endpoint, params = {}) => {
  const cached = optionsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < OPTIONS_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const payload = await request(endpoint, params);
    const value = payload.data
      .filter((item) => item !== null && item !== undefined)
      .map((item) => (typeof item === "string" ? item.trim() : item));
    optionsCache.set(cacheKey, { value, cachedAt: Date.now() });
    return value;
  } catch (error) {
    if (cached) return cached.value;
    throw error;
  }
};

export const getMandiOptions = async (state = "") => {
  if (!state) {
    try {
      const states = await loadOptions("states", "/states");
      const normalizedStates = states
        .map((item) => (typeof item === "string" ? item : textValue(item.state)))
        .filter(Boolean);
      return {
        states: normalizedStates.length ? normalizedStates : SUPPORTED_STATES,
        districts: [],
        markets: [],
        optionsWarning: normalizedStates.length
          ? ""
          : "Using the documented state list because the API returned no state options."
      };
    } catch (error) {
      return {
        states: SUPPORTED_STATES,
        districts: [],
        markets: [],
        optionsWarning: error instanceof Error
          ? error.message
          : "Could not refresh state options from the Mandi Price API."
      };
    }
  }

  let markets;
  let optionsWarning = "";
  try {
    markets = await loadOptions(
      `markets:${state.toLocaleLowerCase()}`,
      "/markets",
      { state }
    );
  } catch (error) {
    markets = [];
    optionsWarning = error instanceof Error
      ? error.message
      : "Could not load mandi filters from the Mandi Price API.";
  }
  const normalizedMarkets = markets
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      market: textValue(item.market),
      district: textValue(item.district)
    }))
    .filter((item) => item.market);

  return {
    states: [],
    districts: Array.from(new Set(normalizedMarkets.map((item) => item.district).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right)),
    markets: normalizedMarkets
      .sort((left, right) => left.market.localeCompare(right.market)),
    optionsWarning
  };
};

const normalizeHistoryRecord = (record) => ({
  state: textValue(record.state),
  district: textValue(record.district),
  market: textValue(record.market),
  commodity: textValue(record.commodity),
  variety: textValue(record.variety),
  grade: textValue(record.grade),
  arrivalDate: textValue(record.arrival_date ?? record.arrivalDate),
  minPrice: priceValue(record.avg_min_price ?? record.min_price ?? record.minPrice),
  maxPrice: priceValue(record.avg_max_price ?? record.max_price ?? record.maxPrice),
  modalPrice: priceValue(record.avg_modal_price ?? record.modal_price ?? record.modalPrice),
  fetchedAt: textValue(record.fetched_at ?? record.fetchedAt),
  dataPoints: priceValue(record.data_points ?? record.dataPoints)
});

export const getMandiPriceHistory = async ({
  state,
  commodity,
  market,
  district,
  from,
  to
}) => {
  if (!state || !commodity) {
    throw new MandiApiError("Choose a state and enter a crop to view price history.", 400);
  }
  if (district && !market) {
    throw new MandiApiError(
      "Select a mandi to view a district-specific price trend.",
      400
    );
  }

  const filters = { state, commodity };
  if (market) filters.market = market;
  if (from) filters.from = from;
  if (to) filters.to = to;
  const snapshot = await fetchCachedRecords(
    "history",
    filters,
    "/prices/history",
    normalizeHistoryRecord
  );
  const records = filterMarket(filterDistrict(snapshot.records, district), market)
    .sort((left, right) => left.arrivalDate.localeCompare(right.arrivalDate));

  return {
    records,
    fetchedAt: snapshot.fetchedAt,
    cacheHit: snapshot.cacheHit,
    stale: snapshot.stale,
    cacheWarning: snapshot.cacheWarning
  };
};
