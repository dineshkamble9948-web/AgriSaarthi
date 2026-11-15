import assert from "node:assert/strict";
import test from "node:test";

import fallbackStore, {
  createFarmEntry,
  isFallbackMode,
  listSatelliteMonitoringByFarm,
  setFallbackMode
} from "../config/fallbackStore.js";
import {
  getSatelliteHistoryForFarm,
  getSatelliteMonitoringForFarm
} from "../controllers/satelliteController.js";
import {
  getSentinelMonitoring,
  SatelliteProviderError,
  satelliteGeometryForFarm,
  SentinelHubProvider
} from "../services/satelliteMonitoringService.js";

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

test("satellite provider requires server-side CDSE credentials", async () => {
  const provider = new SentinelHubProvider({ clientId: "", clientSecret: "" });
  await assert.rejects(
    provider.getMonitoring({}),
    (error) => error instanceof SatelliteProviderError
      && error.statusCode === 503
      && /CDSE_CLIENT_ID/.test(error.message)
  );
});

test("satellite geometry uses farm boundaries or a clearly identified point buffer", () => {
  const farmBoundary = {
    type: "Polygon",
    coordinates: [[[77, 12], [77.001, 12], [77.001, 12.001], [77, 12.001], [77, 12]]]
  };
  assert.equal(
    satelliteGeometryForFarm({ boundary: farmBoundary }).areaSource,
    "farm-boundary"
  );

  const pointArea = satelliteGeometryForFarm({ latitude: 12, longitude: 77 });
  assert.equal(pointArea.areaSource, "approximate-location-buffer");
  assert.equal(pointArea.geometry.coordinates[0].length, 5);
});

test("Sentinel Hub requests real NDVI statistics and image data from documented endpoints", async (t) => {
  const originalFetch = globalThis.fetch;
  const provider = new SentinelHubProvider({ clientId: "test-client", clientSecret: "test-secret" });
  const requestedUrls = [];
  globalThis.fetch = async (url, options) => {
    requestedUrls.push(String(url));

    if (String(url).includes("/openid-connect/token")) {
      assert.match(String(options.body), /grant_type=client_credentials/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "test-token", expires_in: 3600 })
      };
    }

    if (String(url).endsWith("/statistics/v1")) {
      const request = JSON.parse(options.body);
      assert.equal(request.input.data[0].type, "sentinel-2-l2a");
      assert.equal(request.aggregation.aggregationInterval.of, "P10D");
      assert.match(request.aggregation.evalscript, /sample\.B08 - sample\.B04/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              interval: { from: "2025-01-01T00:00:00Z", to: "2025-01-11T00:00:00Z" },
              outputs: { NDVI: { bands: { B0: { stats: { mean: 0.12, sampleCount: 45 } } } } }
            },
            {
              interval: { from: "2025-01-11T00:00:00Z", to: "2025-01-21T00:00:00Z" },
              outputs: { NDVI: { bands: { B0: { stats: { mean: 0.36, sampleCount: 50 } } } } }
            },
            {
              interval: { from: "2025-01-21T00:00:00Z", to: "2025-01-31T00:00:00Z" },
              outputs: { NDVI: { bands: { B0: { stats: { mean: 0.62, sampleCount: 55 } } } } }
            }
          ]
        })
      };
    }

    const request = JSON.parse(options.body);
    assert.equal(request.input.data[0].type, "sentinel-2-l2a");
    assert.equal(request.output.responses[0].format.type, "image/png");
    return {
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const monitoring = await provider.getMonitoring({
    geometry: {
      type: "Polygon",
      coordinates: [[[77, 12], [77.001, 12], [77.001, 12.001], [77, 12.001], [77, 12]]]
    },
    period: { from: "2025-01-01T00:00:00Z", to: "2025-04-01T00:00:00Z" }
  });

  assert.equal(monitoring.source, "Sentinel-2 L2A / Copernicus Data Space");
  assert.equal(monitoring.ndviSeries.length, 3);
  assert.equal(monitoring.latestNDVI, 0.62);
  assert.equal(monitoring.classification, "healthy");
  assert.equal(monitoring.ndviSeries[0].validPixelCount, 45);
  assert.equal(monitoring.imagery.status, "available");
  assert.match(monitoring.imagery.dataUri, /^data:image\/png;base64,/);
  assert.deepEqual(requestedUrls.map((url) => new URL(url).pathname), [
    "/auth/realms/CDSE/protocol/openid-connect/token",
    "/statistics/v1",
    "/process/v1"
  ]);
});

test("satellite statistics without usable observations are reported as unavailable", async (t) => {
  const originalFetch = globalThis.fetch;
  const provider = new SentinelHubProvider({ clientId: "test-client", clientSecret: "test-secret" });
  globalThis.fetch = async (url) => (
    String(url).includes("/openid-connect/token")
      ? {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "test-token", expires_in: 3600 })
      }
      : {
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      }
  );
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    provider.getMonitoring({
      geometry: {
        type: "Polygon",
        coordinates: [[[77, 12], [77.001, 12], [77.001, 12.001], [77, 12.001], [77, 12]]]
      },
      period: { from: "2025-01-01T00:00:00Z", to: "2025-04-01T00:00:00Z" }
    }),
    (error) => error instanceof SatelliteProviderError
      && error.statusCode === 404
      && /No usable Sentinel-2 observations/.test(error.message)
  );
});

test("successful farm satellite lookups are stored and returned in history", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalClientId = process.env.CDSE_CLIENT_ID;
  const originalClientSecret = process.env.CDSE_CLIENT_SECRET;
  const previousFallbackMode = isFallbackMode();
  const ownerId = "satellite-history-owner";
  setFallbackMode(true);
  process.env.CDSE_CLIENT_ID = "test-client";
  process.env.CDSE_CLIENT_SECRET = "test-secret";
  const farm = createFarmEntry(ownerId, {
    farmName: "Satellite Test Farm",
    location: "Test Village",
    state: "Test State",
    area: 2,
    areaUnit: "acres",
    latitude: 12.345,
    longitude: 77.456
  });

  globalThis.fetch = async (url) => {
    if (String(url).includes("/openid-connect/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "test-token", expires_in: 3600 })
      };
    }
    if (String(url).endsWith("/statistics/v1")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            interval: { from: "2025-03-01T00:00:00Z", to: "2025-03-11T00:00:00Z" },
            outputs: { NDVI: { bands: { B0: { stats: { mean: 0.32, sampleCount: 22 } } } } }
          }]
        })
      };
    }
    return {
      ok: false,
      status: 503,
      headers: { get: () => "application/json" },
      json: async () => ({})
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    setFallbackMode(previousFallbackMode);
    fallbackStore.farms = fallbackStore.farms.filter((item) => item._id !== farm._id);
    fallbackStore.satelliteMonitoring = fallbackStore.satelliteMonitoring.filter(
      (item) => item.farm !== farm._id
    );
    if (originalClientId === undefined) delete process.env.CDSE_CLIENT_ID;
    else process.env.CDSE_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.CDSE_CLIENT_SECRET;
    else process.env.CDSE_CLIENT_SECRET = originalClientSecret;
  });

  const response = createResponse();
  await getSatelliteMonitoringForFarm({
    user: { _id: ownerId },
    params: { farmId: farm._id },
    query: { from: "2025-03-01T00:00:00Z", to: "2025-03-31T00:00:00Z" }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.monitoring.classification, "moderate");
  assert.equal(response.body.monitoring.areaSource, "approximate-location-buffer");
  assert.equal(response.body.monitoring.imagery.status, "unavailable");
  assert.equal(listSatelliteMonitoringByFarm(ownerId, farm._id).length, 1);

  const historyResponse = createResponse();
  await getSatelliteHistoryForFarm({
    user: { _id: ownerId },
    params: { farmId: farm._id },
    query: {}
  }, historyResponse);
  assert.equal(historyResponse.statusCode, 200);
  assert.equal(historyResponse.body.history[0].latestNDVI, 0.32);
});

test("satellite monitoring cache only reuses provider results for the same geometry and period", async () => {
  const geometry = {
    type: "Polygon",
    coordinates: [[[77, 12], [77.001, 12], [77.001, 12.001], [77, 12.001], [77, 12]]]
  };
  const period = { from: "2024-01-01T00:00:00Z", to: "2024-03-31T00:00:00Z" };
  let requests = 0;
  const provider = {
    async getMonitoring() {
      requests += 1;
      return { retrievedAt: "2024-04-01T00:00:00.000Z", ndviSeries: [] };
    }
  };

  const first = await getSentinelMonitoring({ geometry, period, areaSource: "farm-boundary" }, provider);
  const second = await getSentinelMonitoring({ geometry, period, areaSource: "farm-boundary" }, provider);
  assert.equal(requests, 1);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
});
