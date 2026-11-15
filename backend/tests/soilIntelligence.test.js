import assert from "node:assert/strict";
import test from "node:test";

import {
  getFertilizerRecommendations,
  lookupSoil
} from "../controllers/soilController.js";
import {
  createFarmPlotEntry,
  isFallbackMode,
  listSoilAssessmentsByOwner,
  setFallbackMode
} from "../config/fallbackStore.js";
import fallbackStore, { upsertFarm } from "../config/fallbackStore.js";
import mongoose from "mongoose";
import SoilAssessment from "../models/SoilAssessment.js";
import {
  SoilProviderError,
  getSoilData,
  normalizeSoilGridsResponse
} from "../services/soilDataService.js";
import { createFertilizerRecommendation } from "../services/fertilizerRecommendationService.js";

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

const useFallbackMode = (t) => {
  const originalMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(originalMode));
};

const layer = (name, value, targetUnits, mappedUnits = targetUnits, dFactor = 10) => ({
  name,
  unit_measure: { d_factor: dFactor, mapped_units: mappedUnits, target_units: targetUnits },
  depths: [{ label: "0-5cm", values: { mean: value } }]
});

const soilGridsPayload = () => ({
  properties: {
    layers: [
      layer("phh2o", 73, "-", "pH*10"),
      layer("nitrogen", 127, "g/kg", "cg/kg", 100),
      layer("soc", 123, "g/kg", "dg/kg"),
      layer("clay", 422, "%", "g/kg"),
      layer("sand", 197, "%", "g/kg"),
      layer("silt", 381, "%", "g/kg"),
      layer("cec", 429, "cmol(c)/kg", "mmol(c)/kg")
    ]
  }
});

test("SoilGrids values are unit-scaled and texture is converted from g/kg to percent", () => {
  const result = normalizeSoilGridsResponse(soilGridsPayload());

  assert.equal(result.parameters.ph.value, 7.3);
  assert.equal(result.parameters.nitrogen.value, 1.27);
  assert.equal(result.parameters.organicCarbon.value, 12.3);
  assert.equal(result.parameters.clay.value, 42.2);
  assert.equal(result.parameters.sand.value, 19.7);
  assert.equal(result.parameters.silt.value, 38.1);
  assert.equal(result.parameters.cec.value, 42.9);
  assert.deepEqual(result.missingProperties, []);
});

test("missing SoilGrids properties stay unavailable and are reported", () => {
  const result = normalizeSoilGridsResponse({
    properties: { layers: [layer("phh2o", 64, "-", "pH*10")] }
  });

  assert.equal(result.parameters.ph.value, 6.4);
  assert.equal(result.parameters.nitrogen.value, null);
  assert.ok(result.missingProperties.includes("nitrogen"));
  assert.ok(result.missingProperties.includes("organicCarbon"));
});

test("an all-null SoilGrids point is reported as unavailable instead of fabricated", () => {
  assert.throws(
    () => normalizeSoilGridsResponse({
      properties: {
        layers: [layer("phh2o", null, "-", "pH*10")]
      }
    }),
    (error) => error instanceof SoilProviderError
      && error.statusCode === 404
      && /no estimates for this point/.test(error.message)
  );
});

test("SoilGrids service caches successful responses and queries the requested layers", async (t) => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (url) => {
    requests += 1;
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.searchParams.get("lat"), "32.4567");
    assert.equal(parsedUrl.searchParams.get("lon"), "71.1234");
    assert.equal(parsedUrl.searchParams.get("depth"), "0-5cm");
    assert.equal(parsedUrl.searchParams.get("value"), "mean");
    assert.deepEqual(parsedUrl.searchParams.getAll("property"), [
      "phh2o", "nitrogen", "soc", "clay", "sand", "silt", "cec"
    ]);
    return { ok: true, json: async () => soilGridsPayload() };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const first = await getSoilData(32.4567, 71.1234);
  const cached = await getSoilData(32.4567, 71.1234);

  assert.equal(first.cacheHit, false);
  assert.equal(cached.cacheHit, true);
  assert.equal(requests, 1);
});

test("SoilGrids service surfaces provider unavailability without returning soil values", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    getSoilData(48.9876, 12.3456),
    (error) => error instanceof SoilProviderError
      && error.statusCode === 503
      && /temporarily unavailable/.test(error.message)
  );
});

test("SoilGrids service reports an upstream request timeout", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => (
    originalSetTimeout(callback, delay === 12000 ? 1 : delay, ...args)
  );
  globalThis.fetch = async (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  });

  await assert.rejects(
    getSoilData(47.1234, 11.9876),
    (error) => error instanceof SoilProviderError
      && error.statusCode === 504
      && /timed out/.test(error.message)
  );
});

test("soil lookup rejects invalid coordinates before contacting the provider", async (t) => {
  let requests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    requests += 1;
    return { ok: true, json: async () => soilGridsPayload() };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const res = createResponse();
  await lookupSoil({
    body: { latitude: 91, longitude: 12 },
    user: { _id: "invalid-coordinate-farmer" }
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(requests, 0);
});

test("successful soil lookup is saved to the farmer's fallback history", async (t) => {
  useFallbackMode(t);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => soilGridsPayload()
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const res = createResponse();
  await lookupSoil({
    body: { latitude: 33.6543, longitude: 72.9876 },
    user: { _id: "soil-storage-farmer" }
  }, res);

  const saved = listSoilAssessmentsByOwner("soil-storage-farmer");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.assessment.source, "SoilGrids");
  assert.equal(res.body.assessment.soilParameters.ph.value, 7.3);
  assert.ok(res.body.assessment.retrievedAt);
  assert.equal(saved.length, 1);
  assert.equal(saved[0]._id, res.body.assessment._id);
});

test("soil assessments are linked to an owned farm and plot", async (t) => {
  useFallbackMode(t);
  const ownerId = "soil-linked-farm-owner";
  const farm = upsertFarm(ownerId, {
    farmName: "Soil Linked Farm",
    location: "Test Village",
    state: "Test State",
    area: 1,
    areaUnit: "acres",
    latitude: 33.6544,
    longitude: 72.9877
  });
  const plot = createFarmPlotEntry(ownerId, farm._id, {
    plotName: "Soil Plot",
    area: 1,
    areaUnit: "acres"
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => soilGridsPayload()
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
    fallbackStore.farms = fallbackStore.farms.filter((item) => item._id !== farm._id);
    fallbackStore.farmPlots = fallbackStore.farmPlots.filter((item) => item._id !== plot._id);
    fallbackStore.soilAssessments = fallbackStore.soilAssessments.filter(
      (item) => item.farmerId !== ownerId
    );
  });

  const res = createResponse();
  await lookupSoil({
    body: { farmId: farm._id, plotId: plot._id },
    user: { _id: ownerId }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.assessment.farm, farm._id);
  assert.equal(res.body.assessment.plot, plot._id);
  assert.equal(res.body.assessment.location.latitude, farm.latitude);
  assert.equal(listSoilAssessmentsByOwner(ownerId, farm._id, plot._id).length, 1);
});

test("soil lookup refuses to attach a report to another farmer's farm", async (t) => {
  useFallbackMode(t);
  const farm = upsertFarm("different-soil-farm-owner", {
    farmName: "Private Farm",
    location: "Test Village",
    area: 1,
    areaUnit: "acres"
  });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return { ok: true, json: async () => soilGridsPayload() };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    fallbackStore.farms = fallbackStore.farms.filter((item) => item._id !== farm._id);
  });

  const res = createResponse();
  await lookupSoil({
    body: { farmId: farm._id, latitude: 33.6543, longitude: 72.9876 },
    user: { _id: "other-soil-farmer" }
  }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(requests, 0);
});

test("successful soil lookup saves an assessment through the Mongo model", async (t) => {
  const originalMode = isFallbackMode();
  const originalSave = SoilAssessment.prototype.save;
  const originalFetch = globalThis.fetch;
  const stored = [];
  setFallbackMode(false);
  SoilAssessment.prototype.save = async function saveAssessment() {
    stored.push(this);
    return this;
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => soilGridsPayload()
  });
  t.after(() => {
    setFallbackMode(originalMode);
    SoilAssessment.prototype.save = originalSave;
    globalThis.fetch = originalFetch;
  });

  const farmerId = new mongoose.Types.ObjectId();
  const res = createResponse();
  await lookupSoil({
    body: { latitude: 34.6543, longitude: 70.9876 },
    user: { _id: farmerId }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(stored.length, 1);
  assert.equal(String(stored[0].farmerId), String(farmerId));
  assert.equal(stored[0].source, "SoilGrids");
  assert.ok(stored[0].retrievedAt instanceof Date);
});

test("fertilizer guidance uses lab interpretations and never invents a dose", () => {
  const result = createFertilizerRecommendation({
    crop: "Rice",
    soilPh: 5.2,
    laboratoryNPK: {
      nitrogen: 100,
      phosphorus: 20,
      potassium: 80,
      unit: "kg/ha",
      status: { nitrogen: "low", phosphorus: "adequate", potassium: "high" }
    }
  });

  assert.deepEqual(result.actions[0].fertilizerTypes, ["Urea", "Ammonium sulphate"]);
  assert.equal(result.actions[0].dosage, null);
  assert.match(result.actions[2].guidance, /Do not add/);
  assert.ok(result.soilImprovements.some((item) => /acidic/.test(item)));
  assert.match(result.dosageNote, /No fertilizer quantities are prescribed/);
});

test("fertilizer recommendation requires valid lab values and persists the report", async (t) => {
  useFallbackMode(t);
  const res = createResponse();
  await getFertilizerRecommendations({
    body: {
      latitude: 12.5,
      longitude: 77.5,
      crop: "Rice",
      soilPh: 6.3,
      laboratoryNPK: {
        nitrogen: 120,
        phosphorus: 15,
        potassium: 90,
        unit: "kg/ha",
        status: { nitrogen: "low", phosphorus: "medium", potassium: "adequate" }
      }
    },
    user: { _id: "fertilizer-storage-farmer" }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.assessment.source, "laboratory-test");
  assert.equal(res.body.assessment.selectedCrop, "Rice");
  assert.equal(res.body.assessment.laboratoryNPK.nitrogen, 120);
  assert.equal(res.body.recommendation.actions[0].dosage, null);
  assert.equal(listSoilAssessmentsByOwner("fertilizer-storage-farmer").length, 1);
});
