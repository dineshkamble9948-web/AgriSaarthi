import assert from "node:assert/strict";
import test from "node:test";

import {
  getWeatherForCoordinates,
  getWeatherForLocation,
  WeatherProviderError
} from "../services/weatherService.js";
import { getWeather, getWeatherHistory } from "../controllers/weatherController.js";
import fallbackStore, {
  isFallbackMode,
  setFallbackMode,
  upsertFarm
} from "../config/fallbackStore.js";

test("weather service normalizes forecast and caches successful location requests", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async (url) => {
    requestCount += 1;
    if (String(url).includes("/geo/")) {
      return {
        ok: true,
        status: 200,
        json: async () => [{ name: "Test Farm", state: "Test State", country: "IN", lat: 12, lon: 77 }]
      };
    }

    if (String(url).includes("/data/2.5/weather?")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          dt: 1_800_000_000,
          timezone: 19_800,
          sys: {
            sunrise: 1_799_980_000,
            sunset: 1_800_020_000,
            country: "IN"
          },
          main: {
            temp: 28,
            feels_like: 30,
            humidity: 72,
            pressure: 1012
          },
          wind: { speed: 4, deg: 180 },
          rain: { "1h": 1.2 },
          weather: [{ main: "Rain", description: "light rain", icon: "10d" }]
        })
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        city: { timezone: 19_800 },
        list: Array.from({ length: 40 }, (_, index) => ({
          dt: 1_800_000_000 + index * 10_800,
          main: { temp: 27 + (index % 4) },
          pop: 0.4,
          rain: { "3h": 1.5 },
          weather: [{ main: "Clouds", description: "few clouds" }]
        }))
      })
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await getWeatherForLocation("Test Farm Cache Test", "Test State", "test-key");
  const cachedResult = await getWeatherForLocation("Test Farm Cache Test", "Test State", "test-key");

  assert.equal(requestCount, 3);
  assert.equal(result.location.timezoneOffsetSeconds, 19_800);
  assert.equal(result.current.windSpeedKph, 14.4);
  assert.equal(result.current.rainfallLastHourMm, 1.2);
  assert.equal(result.hourly.length, 8);
  assert.equal(result.daily.length, 5);
  assert.deepEqual(result.alerts.map((alert) => alert.type), ["spraying_conditions"]);
  assert.equal(cachedResult.cacheHit, true);
});

test("weather service uses coordinates directly and caches successful responses", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async (url) => {
    requestCount += 1;
    assert.match(String(url), /lat=12\.5/);
    assert.match(String(url), /lon=77\.5/);

    if (String(url).includes("/data/2.5/weather?")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          dt: 1_800_000_000,
          main: { temp: 29, humidity: 68 },
          wind: { speed: 2 },
          weather: [{ main: "Clear", description: "clear sky" }]
        })
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        city: { timezone: 0 },
        list: Array.from({ length: 8 }, (_, index) => ({
          dt: 1_800_000_000 + index * 10_800,
          main: { temp: 28 },
          pop: 0,
          weather: [{ main: "Clear", description: "clear sky" }]
        }))
      })
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await getWeatherForCoordinates(12.5, 77.5, "test-key", "Test Farm");
  const cachedResult = await getWeatherForCoordinates(12.5, 77.5, "test-key", "Test Farm");
  assert.equal(requestCount, 2);
  assert.equal(result.location.latitude, 12.5);
  assert.equal(result.location.longitude, 77.5);
  assert.equal(result.location.name, "Test Farm");
  assert.equal(result.alerts[0].type, "possible_irrigation");
  assert.equal(cachedResult.cacheHit, true);
});

test("weather coordinate lookup rejects out-of-range values before requesting the provider", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("The provider must not be called for invalid coordinates.");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    getWeatherForCoordinates(90.1, 0, "test-key"),
    (error) => error instanceof WeatherProviderError
      && error.statusCode === 400
  );
});

test("weather service reports rejected provider credentials clearly", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ message: "Invalid API key" })
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    getWeatherForLocation("Invalid Key Test Location", "", "invalid-key"),
    (error) => error instanceof WeatherProviderError
      && error.statusCode === 502
      && /API key/.test(error.message)
      && /location lookup/.test(error.message)
  );
});

test("weather service identifies when standard forecast access is denied", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/geo/")) {
      return {
        ok: true,
        status: 200,
        json: async () => [{ name: "Test Farm", country: "IN", lat: 12, lon: 77 }]
      };
    }

    if (String(url).includes("/data/2.5/weather?")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          dt: 1_800_000_000,
          main: { temp: 28, humidity: 72 },
          weather: [{ main: "Clear", description: "clear sky" }]
        })
      };
    }

    return {
      ok: false,
      status: 403,
      json: async () => ({ message: "Access denied" })
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    getWeatherForLocation("Standard Forecast Access Test Location", "", "test-key"),
    (error) => error instanceof WeatherProviderError
      && /standard 5-day forecast API/.test(error.message)
  );
});

test("weather route asks for server-side key configuration without exposing credentials", async (t) => {
  const previousKey = process.env.OPENWEATHER_API_KEY;
  delete process.env.OPENWEATHER_API_KEY;
  t.after(() => {
    if (previousKey === undefined) {
      delete process.env.OPENWEATHER_API_KEY;
    } else {
      process.env.OPENWEATHER_API_KEY = previousKey;
    }
  });

  const response = {
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
  };
  await getWeather({ query: { location: "Test Farm" } }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /OPENWEATHER_API_KEY/);
});

test("farm weather requests save and return owner-scoped weather history", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENWEATHER_API_KEY;
  const previousFallbackMode = isFallbackMode();
  const ownerId = "weather-history-owner";
  setFallbackMode(true);
  process.env.OPENWEATHER_API_KEY = "test-key";
  const farm = upsertFarm(ownerId, {
    farmName: "Weather History Farm",
    location: "Test Village",
    state: "Test State",
    area: 1,
    areaUnit: "acres",
    latitude: 12.51,
    longitude: 77.51
  });

  globalThis.fetch = async (url) => {
    if (String(url).includes("/data/2.5/weather?")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          dt: 1_800_000_000,
          main: { temp: 28, humidity: 65 },
          wind: { speed: 1 },
          weather: [{ main: "Clear", description: "clear sky" }]
        })
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        city: { timezone: 0 },
        list: Array.from({ length: 8 }, (_, index) => ({
          dt: 1_800_000_000 + index * 10_800,
          main: { temp: 27 },
          pop: 0,
          weather: [{ main: "Clear", description: "clear sky" }]
        }))
      })
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    setFallbackMode(previousFallbackMode);
    fallbackStore.farms = fallbackStore.farms.filter((item) => item._id !== farm._id);
    fallbackStore.weatherHistory = fallbackStore.weatherHistory.filter((item) => item.farm !== farm._id);
    if (originalKey === undefined) {
      delete process.env.OPENWEATHER_API_KEY;
    } else {
      process.env.OPENWEATHER_API_KEY = originalKey;
    }
  });

  const weatherResponse = createResponse();
  await getWeather({
    user: { _id: ownerId },
    query: { farmId: farm._id }
  }, weatherResponse);
  assert.equal(weatherResponse.statusCode, 200);
  assert.equal(weatherResponse.body.weather.location.latitude, 12.51);
  assert.equal(fallbackStore.weatherHistory.length, 1);

  const historyResponse = createResponse();
  await getWeatherHistory({
    user: { _id: ownerId },
    query: { farmId: farm._id }
  }, historyResponse);
  assert.equal(historyResponse.statusCode, 200);
  assert.equal(historyResponse.body.history.length, 1);
});

function createResponse() {
  return {
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
  };
}
