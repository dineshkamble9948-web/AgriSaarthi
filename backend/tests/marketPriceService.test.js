import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

import {
  getMandiOptions,
  getMandiPriceHistory,
  getMandiPrices,
  MandiApiError
} from "../services/marketPriceService.js";
import { getMarketPrices } from "../controllers/marketController.js";
import { isFallbackMode, setFallbackMode } from "../config/fallbackStore.js";
import MarketPriceCache from "../models/MarketPriceCache.js";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

const apiResponse = (data, meta = {}) => ({
  data: {
    success: true,
    data,
    meta: { latest_fetched_at: "2026-11-14T05:30:00.000Z", ...meta }
  }
});

const useMemoryCache = (t) => {
  const originalMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(originalMode));
};

const useMongoCacheMock = (t) => {
  const originalMode = isFallbackMode();
  const originalFindOne = MarketPriceCache.findOne;
  const originalFindOneAndUpdate = MarketPriceCache.findOneAndUpdate;
  let storedSnapshot = null;
  setFallbackMode(false);

  MarketPriceCache.findOne = ({ cacheKey }) => ({
    lean: async () => (storedSnapshot?.cacheKey === cacheKey ? storedSnapshot : null)
  });
  MarketPriceCache.findOneAndUpdate = async (filter, update) => {
    storedSnapshot = { ...update.$set, cacheKey: filter.cacheKey };
    return storedSnapshot;
  };
  t.after(() => {
    setFallbackMode(originalMode);
    MarketPriceCache.findOne = originalFindOne;
    MarketPriceCache.findOneAndUpdate = originalFindOneAndUpdate;
  });

  return () => storedSnapshot;
};

const mockAxiosGet = (t, implementation) => {
  const originalGet = axios.get;
  axios.get = implementation;
  t.after(() => {
    axios.get = originalGet;
  });
};

test("Mandi prices use documented filters, normalize records, and reuse cache snapshots", async (t) => {
  useMemoryCache(t);
  let requestCount = 0;
  mockAxiosGet(t, async (url, options) => {
    requestCount += 1;
    assert.equal(url, "https://mandi-api.onrender.com/v1/prices");
    assert.deepEqual(options.params, {
      state: "Karnataka",
      commodity: "Tomato"
    });

    return apiResponse([{
      state: "Karnataka",
      district: "Bengaluru",
      market: "Test Mandi",
      commodity: "Tomato",
      arrival_date: "2026-11-13",
      min_price: "1200",
      max_price: "1800",
      modal_price: "1600",
      fetched_at: "2026-11-14T05:30:00.000Z"
    }]);
  });

  const filters = { state: "Karnataka", commodity: "Tomato" };
  const first = await getMandiPrices(filters);
  const second = await getMandiPrices(filters);

  assert.equal(first.records.length, 1);
  assert.equal(first.records[0].arrivalDate, "2026-11-13");
  assert.equal(first.records[0].minPrice, 1200);
  assert.equal(first.records[0].maxPrice, 1800);
  assert.equal(first.records[0].modalPrice, 1600);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(requestCount, 1);
});

test("successful price responses are persisted in MongoDB cache snapshots", async (t) => {
  const getSnapshot = useMongoCacheMock(t);
  let requestCount = 0;
  mockAxiosGet(t, async () => {
    requestCount += 1;
    return apiResponse([{
      state: "Maharashtra",
      district: "Nagpur",
      market: "Nagpur",
      commodity: "Rice",
      arrival_date: "2026-11-12",
      min_price: 1300,
      max_price: 1700,
      modal_price: 1500
    }]);
  });

  const filters = { state: "Maharashtra", commodity: "Rice" };
  await getMandiPrices(filters);
  const snapshot = getSnapshot();
  const cachedResult = await getMandiPrices(filters);

  assert.equal(snapshot.records[0].commodity, "Rice");
  assert.equal(snapshot.records[0].state, "Maharashtra");
  assert.equal(snapshot.records[0].district, "Nagpur");
  assert.equal(snapshot.records[0].market, "Nagpur");
  assert.equal(snapshot.records[0].minPrice, 1300);
  assert.equal(snapshot.records[0].maxPrice, 1700);
  assert.equal(snapshot.records[0].modalPrice, 1500);
  assert.equal(snapshot.records[0].arrivalDate, "2026-11-12");
  assert.equal(cachedResult.cacheHit, true);
  assert.equal(requestCount, 1);
});

test("district filtering is applied to source records without inventing an upstream parameter", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async (url, options) => {
    assert.equal(url, "https://mandi-api.onrender.com/v1/prices");
    assert.deepEqual(options.params, {
      state: "Maharashtra",
      commodity: "Onion"
    });
    return apiResponse([
      { state: "Maharashtra", district: "Pune", market: "Pune", commodity: "Onion", modal_price: 1500 },
      { state: "Maharashtra", district: "Nagpur", market: "Nagpur", commodity: "Onion", modal_price: 1600 }
    ]);
  });

  const result = await getMandiPrices({
    state: "Maharashtra",
    commodity: "Onion",
    district: "nAgPuR"
  });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].district, "Nagpur");
});

test("mandi selection filters similarly named source markets exactly", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => apiResponse([
    { state: "Maharashtra", district: "Nagpur", market: "Nagpur", commodity: "Onion", modal_price: 1600 },
    { state: "Maharashtra", district: "Nagpur", market: "Nagpur Rural", commodity: "Onion", modal_price: 1500 }
  ]));

  const result = await getMandiPrices({
    state: "Maharashtra",
    commodity: "Onion",
    market: "Nagpur"
  });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].market, "Nagpur");
});

test("market options normalize the documented market and district list", async (t) => {
  mockAxiosGet(t, async (url, options) => {
    assert.equal(url, "https://mandi-api.onrender.com/v1/markets");
    assert.deepEqual(options.params, { state: "Karnataka" });
    return apiResponse([
      { market: "Kolar", district: "Kolar" },
      { market: "Bengaluru", district: "Bengaluru" }
    ]);
  });

  const result = await getMandiOptions("Karnataka");

  assert.deepEqual(result.districts, ["Bengaluru", "Kolar"]);
  assert.deepEqual(result.markets.map((item) => item.market), ["Bengaluru", "Kolar"]);
});

test("the documented state list remains available when the API cannot supply options", async (t) => {
  mockAxiosGet(t, async () => {
    const error = new Error("Unavailable");
    error.isAxiosError = true;
    error.response = { status: 503 };
    throw error;
  });

  const result = await getMandiOptions();

  assert.deepEqual(result.states, [
    "Maharashtra",
    "Uttar Pradesh",
    "Punjab",
    "Madhya Pradesh",
    "Karnataka"
  ]);
  assert.match(result.optionsWarning, /temporarily unavailable/);
});

test("historical averages normalize to chart-ready prices", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async (url, options) => {
    assert.equal(url, "https://mandi-api.onrender.com/v1/prices/history");
    assert.deepEqual(options.params, {
      state: "Karnataka",
      commodity: "Tomato"
    });
    return apiResponse([{
      arrival_date: "2026-11-10",
      avg_modal_price: "1750",
      avg_min_price: "1400",
      avg_max_price: "2000",
      data_points: 12
    }]);
  });

  const result = await getMandiPriceHistory({
    state: "Karnataka",
    commodity: "Tomato"
  });

  assert.equal(result.records[0].arrivalDate, "2026-11-10");
  assert.equal(result.records[0].modalPrice, 1750);
  assert.equal(result.records[0].dataPoints, 12);
});

test("stale cached prices are returned when the upstream API is unavailable", async (t) => {
  useMemoryCache(t);
  let requestCount = 0;
  mockAxiosGet(t, async () => {
    requestCount += 1;
    if (requestCount > 1) {
      const error = new Error("Unavailable");
      error.isAxiosError = true;
      error.response = { status: 503 };
      throw error;
    }
    return apiResponse([{
      state: "Karnataka",
      commodity: "Cache fallback crop",
      district: "Mysuru",
      market: "Mysuru",
      arrival_date: "2026-11-13",
      modal_price: 1400
    }]);
  });

  const originalNow = Date.now;
  const initialTime = originalNow();
  await getMandiPrices({ state: "Karnataka", commodity: "Cache fallback crop" });
  Date.now = () => initialTime + (16 * 60 * 1000);
  t.after(() => {
    Date.now = originalNow;
  });

  const result = await getMandiPrices({
    state: "Karnataka",
    commodity: "Cache fallback crop"
  });

  assert.equal(result.stale, true);
  assert.equal(result.records[0].modalPrice, 1400);
  assert.match(result.cacheWarning, /previously cached prices/);
});

test("invalid upstream response formats fail with an explicit service error", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => ({ data: { success: true, data: null } }));

  await assert.rejects(
    getMandiPrices({ commodity: "Invalid response format crop" }),
    (error) => error instanceof MandiApiError
      && error.statusCode === 502
      && /unexpected response/.test(error.message)
  );
});

test("Mandi API rate limits map to a retryable service error", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => {
    const error = new Error("Rate limited");
    error.isAxiosError = true;
    error.response = { status: 429 };
    throw error;
  });

  await assert.rejects(
    getMandiPrices({ commodity: "Rate limit test crop" }),
    (error) => error instanceof MandiApiError
      && error.statusCode === 503
      && /request limit/.test(error.message)
  );
});

test("Mandi API timeouts return an explicit gateway timeout", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => {
    const error = new Error("Request timed out");
    error.isAxiosError = true;
    error.code = "ECONNABORTED";
    throw error;
  });

  await assert.rejects(
    getMandiPrices({ commodity: "Timeout test crop" }),
    (error) => error instanceof MandiApiError
      && error.statusCode === 504
      && /timed out/.test(error.message)
  );
});

test("invalid crop searches return an empty result without a render-breaking payload", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => apiResponse([]));

  const result = await getMandiPrices({ commodity: "DefinitelyNotARealCrop" });

  assert.deepEqual(result.records, []);
  assert.equal(result.total, 0);
});

test("price route rejects an empty search before calling the provider", async () => {
  const response = createResponse();
  await getMarketPrices({ query: {} }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Choose a state or enter a crop/);
});

test("price route rejects invalid dates before calling the provider", async () => {
  const response = createResponse();
  await getMarketPrices({
    query: { commodity: "Tomato", date: "2026-02-30" }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /valid YYYY-MM-DD date/);
});

test("price route surfaces a useful error when the API is unavailable", async (t) => {
  useMemoryCache(t);
  mockAxiosGet(t, async () => {
    const error = new Error("Rate limited");
    error.isAxiosError = true;
    error.response = { status: 429 };
    throw error;
  });

  const response = createResponse();
  await getMarketPrices({
    query: { commodity: "Unavailable API test crop" }
  }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /request limit/);
});
