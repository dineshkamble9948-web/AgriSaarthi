import assert from "node:assert/strict";
import test from "node:test";

import fallbackStore, {
  createFarmPlotEntry,
  createFarmEntry,
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import {
  createCropCycle,
  getCropCycles,
  updateCropCycle
} from "../controllers/cropCycleController.js";
import {
  buildCropCycleFields,
  estimateCropStage
} from "../services/cropLifecycleService.js";

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

test("crop stage estimates use farmer-entered sowing and harvest dates", () => {
  const cycle = {
    sowingDate: new Date("2025-01-01T00:00:00.000Z"),
    expectedHarvestDate: new Date("2025-04-11T00:00:00.000Z"),
    stageUpdatedManually: false,
    growthStage: "Sowing"
  };

  assert.deepEqual(estimateCropStage(cycle, new Date("2024-12-30T00:00:00.000Z")), {
    currentStage: "Land Preparation",
    stageSource: "estimated-from-farmer-dates",
    progressPercent: 0
  });
  assert.deepEqual(estimateCropStage(cycle, new Date("2025-02-20T00:00:00.000Z")), {
    currentStage: "Vegetative Growth",
    stageSource: "estimated-from-farmer-dates",
    progressPercent: 50
  });
  assert.deepEqual(estimateCropStage({
    ...cycle,
    stageUpdatedManually: true,
    growthStage: "Flowering"
  }, new Date("2025-02-20T00:00:00.000Z")), {
    currentStage: "Flowering",
    stageSource: "farmer-updated",
    progressPercent: null
  });
});

test("crop cycle dates must define a positive growing period", () => {
  const result = buildCropCycleFields({
    cropName: "Rice",
    sowingDate: "2025-06-01",
    expectedHarvestDate: "2025-05-01"
  });

  assert.match(result.error, /after the sowing date/);
});

test("crop cycles are farm/plot scoped and support manual stage updates", async (t) => {
  const ownerId = "crop-cycle-owner";
  const otherOwnerId = "other-crop-cycle-owner";
  const previousFallbackMode = isFallbackMode();
  setFallbackMode(true);
  const farm = createFarmEntry(ownerId, {
    farmName: "Lifecycle Farm",
    location: "Test Village",
    state: "Test State",
    area: 2,
    areaUnit: "acres"
  });
  const plot = createFarmPlotEntry(ownerId, farm._id, {
    plotName: "Lifecycle Plot",
    area: 1,
    areaUnit: "acres"
  });
  t.after(() => {
    setFallbackMode(previousFallbackMode);
    fallbackStore.cropCycles = fallbackStore.cropCycles.filter(
      (cycle) => cycle.farm !== farm._id
    );
    fallbackStore.farmPlots = fallbackStore.farmPlots.filter(
      (item) => item._id !== plot._id
    );
    fallbackStore.farms = fallbackStore.farms.filter((item) => item._id !== farm._id);
  });

  const createResponseValue = createResponse();
  await createCropCycle({
    user: { _id: ownerId },
    params: { farmId: farm._id },
    body: {
      plotId: plot._id,
      cropName: "Rice",
      cropVariety: "Test variety",
      sowingDate: "2025-01-01",
      expectedHarvestDate: "2025-04-11",
      irrigationMethod: "Drip"
    }
  }, createResponseValue);

  assert.equal(createResponseValue.statusCode, 201);
  assert.equal(createResponseValue.body.cycle.durationDays, 100);
  assert.equal(createResponseValue.body.cycle.plot, plot._id);
  assert.equal(createResponseValue.body.cycle.stageSource, "estimated-from-farmer-dates");

  const cycleId = createResponseValue.body.cycle._id;
  const updateResponseValue = createResponse();
  await updateCropCycle({
    user: { _id: ownerId },
    params: { farmId: farm._id, cycleId },
    body: { growthStage: "Flowering" }
  }, updateResponseValue);
  assert.equal(updateResponseValue.body.cycle.currentStage, "Flowering");
  assert.equal(updateResponseValue.body.cycle.stageSource, "farmer-updated");

  const listResponseValue = createResponse();
  await getCropCycles({
    user: { _id: ownerId },
    params: { farmId: farm._id }
  }, listResponseValue);
  assert.equal(listResponseValue.body.cycles.length, 1);

  const deniedResponseValue = createResponse();
  await getCropCycles({
    user: { _id: otherOwnerId },
    params: { farmId: farm._id }
  }, deniedResponseValue);
  assert.equal(deniedResponseValue.statusCode, 404);
});
