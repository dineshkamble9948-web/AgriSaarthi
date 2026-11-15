import assert from "node:assert/strict";
import test from "node:test";

import { createIrrigationRecommendation } from "../services/irrigationRecommendationService.js";

const cropCycle = {
  cropName: "Rice",
  currentStage: "Flowering",
  growthStage: "Flowering",
  stageSource: "farmer-updated"
};

const weatherWith = (rainfallMm, precipitationProbabilityPercent) => ({
  hourly: Array.from({ length: 8 }, () => ({
    rainfallMm,
    precipitationProbabilityPercent
  }))
});

test("low rainfall recommends a field check without claiming measured soil moisture", () => {
  const guidance = createIrrigationRecommendation({
    cropCycle,
    weather: weatherWith(0, 10),
    soilAssessment: {
      source: "SoilGrids",
      soilParameters: {
        sand: { value: 75, modelled: true },
        clay: { value: 10, modelled: true }
      }
    }
  });

  assert.equal(guidance.status, "field-check-recommended");
  assert.equal(guidance.rainfallNext24HoursMm, 0);
  assert.match(guidance.recommendation, /Check the crop and root-zone soil/);
  assert.match(guidance.soilContext.source, /modelled/);
  assert.ok(guidance.notes.some((note) => /No soil-moisture sensor/.test(note)));
  assert.ok(guidance.cropStageGuidance.includes("Flowering"));
});

test("substantial forecast rain recommends reassessment instead of irrigation", () => {
  const guidance = createIrrigationRecommendation({
    cropCycle,
    weather: weatherWith(1.5, 80)
  });

  assert.equal(guidance.status, "rainfall-likely");
  assert.match(guidance.recommendedTiming, /after the forecast rain/);
});

test("missing weather or crop data is reported as insufficient", () => {
  const guidance = createIrrigationRecommendation({
    cropCycle: null,
    weather: null,
    weatherError: "OPENWEATHER_API_KEY is not configured."
  });

  assert.equal(guidance.status, "insufficient-data");
  assert.deepEqual(guidance.missingInputs, [
    "Current crop and growth stage",
    "Current weather forecast"
  ]);
  assert.ok(guidance.notes.some((note) => /OPENWEATHER_API_KEY/.test(note)));
  assert.equal(guidance.rainfallNext24HoursMm, null);
});

test("a weather response without forecast precipitation does not produce an irrigation decision", () => {
  const guidance = createIrrigationRecommendation({
    cropCycle,
    weather: { hourly: [{ rainfallMm: null, precipitationProbabilityPercent: null }] }
  });

  assert.equal(guidance.status, "insufficient-data");
  assert.ok(guidance.missingInputs.includes("24-hour rainfall forecast"));
});
