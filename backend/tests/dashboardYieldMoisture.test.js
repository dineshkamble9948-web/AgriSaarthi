import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSoilWaterBalance,
  getDistrictCropYieldStatistics
} from "../services/karnatakaAgriculturalService.js";
import {
  getRegionalCropYields,
  getRegionalSoilMoisture
} from "../controllers/cropRecommendationController.js";
import {
  createUser,
  createFarmEntry,
  createFarmPlotEntry,
  setFallbackMode,
  isFallbackMode
} from "../config/fallbackStore.js";
import { getUnifiedPlotDashboard } from "../controllers/dashboardController.js";

function mockResponse() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };
  return res;
}

test("calculateSoilWaterBalance calculates scientific agro-climatic water balance without mock text", () => {
  // Test Black soil (Vertisol) with normal weather
  const normal = calculateSoilWaterBalance({
    soilType: "Medium Black",
    weather: { temperatureC: 28, humidityPercent: 65, rainfallMm: 0 },
    district: "Raichur"
  });

  assert.equal(normal.availableWaterCapacityMm, 200);
  assert.ok(normal.moisturePercent >= 50 && normal.moisturePercent <= 75);
  assert.equal(normal.isSensorReading, false);
  assert.match(normal.provenance, /Sujala-3 LRI/);
  assert.equal(normal.status, "Optimal");

  // Test dry hot weather deficit
  const dry = calculateSoilWaterBalance({
    soilType: "Red Sandy Loam",
    weather: { temperatureC: 38, humidityPercent: 28, rainfallMm: 0 },
    district: "Chitradurga"
  });
  assert.equal(dry.availableWaterCapacityMm, 140);
  assert.ok(dry.moisturePercent < 50);
  assert.ok(dry.status === "Depleting" || dry.status === "Critical Deficit");
  assert.match(dry.recommendation, /irrigation/i);

  // Test post-rain saturation
  const wet = calculateSoilWaterBalance({
    soilType: "Clay",
    weather: { temperatureC: 22, humidityPercent: 90, rainfallMm: 35 },
    district: "Belagavi"
  });
  assert.ok(wet.moisturePercent >= 80);
  assert.equal(wet.status, "High / Saturated");
});

test("getDistrictCropYieldStatistics returns official DES Karnataka statistics and scales with acreage", () => {
  // Test Raichur Cotton with 3 acres
  const cottonRaichur = getDistrictCropYieldStatistics("Raichur", "cotton", 3);

  assert.equal(cottonRaichur.district, "Raichur");
  assert.equal(cottonRaichur.crop, "cotton");
  assert.equal(cottonRaichur.areaAcres, 3);
  assert.ok(cottonRaichur.avgYieldQuintalsAcre > 5);
  assert.equal(cottonRaichur.totalExpectedYieldQuintals, +(cottonRaichur.avgYieldQuintalsAcre * 3).toFixed(1));
  assert.equal(cottonRaichur.totalExpectedYieldTonnes, +(cottonRaichur.avgYieldTonnesAcre * 3).toFixed(2));
  assert.ok(cottonRaichur.trendSeries.length > 0);
  assert.match(cottonRaichur.source, /Directorate of Economics and Statistics/);

  // Test Maize with 1 acre
  const maizeDharwad = getDistrictCropYieldStatistics("Dharwad", "maize", 1);
  assert.equal(maizeDharwad.district, "Dharwad");
  assert.ok(maizeDharwad.avgYieldTonnesAcre > 0.8);
  assert.ok(maizeDharwad.popPotentialQuintalsAcre > maizeDharwad.avgYieldQuintalsAcre);
});

test("Crop Recommendation Controller exposes official yield and moisture balance endpoints", () => {
  const resYield = mockResponse();
  getRegionalCropYields({ query: { district: "Raichur", crop: "cotton", area: "2.5" } }, resYield);
  assert.equal(resYield.statusCode, 200);
  assert.equal(resYield.payload.success, true);
  assert.equal(resYield.payload.data.areaAcres, 2.5);

  const resMoist = mockResponse();
  getRegionalSoilMoisture({
    query: {
      soilType: "Black",
      district: "Raichur",
      temperatureC: "30",
      humidityPercent: "60",
      rainfallMm: "0"
    }
  }, resMoist);
  assert.equal(resMoist.statusCode, 200);
  assert.equal(resMoist.payload.success, true);
  assert.ok(resMoist.payload.data.moisturePercent > 0);
});

test("Unified Plot Dashboard returns yieldEstimate and soilMoistureAssessment in payload", async (t) => {
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const user = createUser({
    name: "Yield Test Farmer",
    phone: "9887766554",
    email: "yieldtest@agrisaarthi.in"
  });

  const farm = createFarmEntry(user._id, {
    farmName: "Tungabhadra Farm",
    location: "Raichur Rural",
    district: "Raichur",
    area: 4,
    soilType: "Black"
  });

  const plot = createFarmPlotEntry(user._id, farm._id, {
    plotName: "North Cotton Field",
    area: 4,
    currentCrop: "Cotton",
    soilType: "Black"
  });

  const req = {
    user,
    params: { plotId: plot._id }
  };
  const res = mockResponse();

  await getUnifiedPlotDashboard(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.ok(res.payload.data.yieldEstimate);
  assert.ok(res.payload.data.soilMoistureAssessment);
  assert.equal(res.payload.data.yieldEstimate.crop, "cotton");
  assert.equal(res.payload.data.yieldEstimate.areaAcres, 4);
  assert.ok(res.payload.data.soilMoistureAssessment.moisturePercent > 0);
});
