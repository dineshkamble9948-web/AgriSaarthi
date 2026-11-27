import assert from "node:assert/strict";
import test from "node:test";

import {
  getKarnatakaDistricts,
  getKarnatakaTaluks,
  getKarnatakaSoilProfile,
  getKarnatakaRainfallProfile,
  enhanceCropRecommendations
} from "../services/karnatakaAgriculturalService.js";
import {
  predictCropFallback,
  recommendCrops
} from "../controllers/cropRecommendationController.js";

test("getKarnatakaDistricts returns all key Karnataka districts", () => {
  const districts = getKarnatakaDistricts();
  assert.ok(districts.length >= 30, `Expected at least 30 districts, got ${districts.length}`);
  const keyDistricts = ["Raichur", "Bengaluru Urban", "Mysuru", "Belagavi", "Kalaburagi", "Ballari", "Vijayapura", "Dharwad"];
  for (const kd of keyDistricts) {
    assert.ok(districts.includes(kd), `Expected ${kd} in districts list`);
  }
});

test("getKarnatakaTaluks returns taluks for a given district", () => {
  const taluks = getKarnatakaTaluks("Raichur");
  assert.ok(Array.isArray(taluks));
  assert.ok(taluks.includes("Manvi"));
  assert.ok(taluks.includes("Sindhanur"));
});

test("getKarnatakaSoilProfile returns official benchmark soil parameters", () => {
  const profile = getKarnatakaSoilProfile("Raichur", "Manvi");
  assert.equal(profile.district, "Raichur");
  assert.ok(profile.nitrogen > 0);
  assert.ok(profile.phosphorus > 0);
  assert.ok(profile.potassium > 0);
  assert.ok(profile.soil_ph > 0);
  assert.ok(profile.organic_carbon_percent > 0);
  assert.ok(profile.zinc_ppm > 0);
  assert.ok(Array.isArray(profile.deficiencies));
  assert.ok(Array.isArray(profile.soil_health_advisories));
});

test("getKarnatakaRainfallProfile returns seasonal rainfall and agro-climatic zone", () => {
  const rain = getKarnatakaRainfallProfile("Belagavi");
  assert.ok(rain.annual_rainfall_mm > 0);
  assert.ok(rain.kharif_rainfall_mm > 0);
  assert.ok(rain.rainfall_zone.length > 0);
});

test("predictCropFallback provides top three crops within valid ranges", () => {
  const input = { N: 90, P: 42, K: 43, temperature: 26, humidity: 80, ph: 6.5, rainfall: 200 };
  const recs = predictCropFallback(input);
  assert.equal(recs.length, 3);
  assert.ok(recs[0].score_percent > 0);
  assert.ok(recs[0].crop.length > 0);
});

test("enhanceCropRecommendations computes suitability scores, required vs available parameters, and advisories", () => {
  const baseRecs = [
    { crop: "rice", score: 0.75, score_percent: 75 },
    { crop: "cotton", score: 0.15, score_percent: 15 },
    { crop: "maize", score: 0.10, score_percent: 10 }
  ];
  const inputs = { N: 80, P: 40, K: 40, temperature: 27, humidity: 80, ph: 6.5, rainfall: 650 };

  const enhanced = enhanceCropRecommendations(baseRecs, inputs, "Raichur", "Raichur", "Kharif", false);

  assert.equal(enhanced.success, true);
  assert.equal(enhanced.location.district, "Raichur");
  assert.equal(enhanced.top_three_recommendations.length, 3);

  const topCrop = enhanced.top_three_recommendations[0];
  assert.ok(topCrop.suitability_score > 0);
  assert.ok(topCrop.canonical_name);
  assert.ok(topCrop.required_soil_conditions.nitrogen_range);
  assert.ok(topCrop.available_soil_conditions.nitrogen);
  assert.ok(topCrop.rainfall_suitability);
  assert.ok(topCrop.explanation);
  assert.ok(Array.isArray(enhanced.soil_health_deficiencies));
  assert.ok(Array.isArray(enhanced.soil_management_suggestions));
});

test("recommendCrops controller handles offline ML service gracefully with Karnataka enrichment", async () => {
  const req = {
    body: {
      N: 23,
      P: 56,
      K: 23,
      temperature: 22,
      humidity: 23,
      ph: 6.5,
      rainfall: 232,
      district: "Raichur",
      season: "Kharif"
    }
  };

  let statusCode = null;
  let responseBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  await recommendCrops(req, res);

  assert.equal(statusCode, 200);
  assert.equal(responseBody.success, true);
  assert.ok(responseBody.top_three_recommendations.length > 0);
  assert.equal(responseBody.location.district, "Raichur");
  assert.ok(responseBody.soil_health_deficiencies);
  assert.ok(responseBody.soil_management_suggestions);
});
