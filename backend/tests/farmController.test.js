import assert from "node:assert/strict";
import test from "node:test";

import fallbackStore, {
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import {
  createFarmPlot,
  getFarmPlots,
  getMyFarms,
  saveFarm,
  updateFarmPlot
} from "../controllers/farmController.js";

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

function makeFarmBody(farmName, overrides = {}) {
  return {
    farmName,
    location: "Test Village",
    state: "Karnataka",
    area: 1,
    areaUnit: "acres",
    soilType: "Red",
    latitude: 12.5,
    longitude: 77.5,
    ...overrides
  };
}

test("farm save validates coordinate ranges and calculates area from boundaries", async (t) => {
  const ownerId = "farm-geospatial-test-owner";
  const wasFallbackMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => {
    setFallbackMode(wasFallbackMode);
    fallbackStore.farms = fallbackStore.farms.filter((farm) => farm.owner !== ownerId);
  });

  const boundary = {
    type: "Polygon",
    coordinates: [[[77.5, 12.5], [77.501, 12.5], [77.501, 12.501], [77.5, 12.501]]]
  };
  const response = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: makeFarmBody("Mapped Farm", { boundary })
  }, response);

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.farm.area > 1);
  assert.equal(response.body.farm.boundary.coordinates[0].length, 5);
  assert.equal(response.body.farm.latitude, 12.5);

  const invalidResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: makeFarmBody("Invalid Farm", { latitude: 91 })
  }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.match(invalidResponse.body.message, /Latitude/);
});

test("farm APIs support multiple farms and owner-scoped plot creation and updates", async (t) => {
  const ownerId = "farm-plots-test-owner";
  const otherOwnerId = "farm-plots-other-owner";
  const wasFallbackMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => {
    setFallbackMode(wasFallbackMode);
    const farmIds = fallbackStore.farms
      .filter((farm) => farm.owner === ownerId || farm.owner === otherOwnerId)
      .map((farm) => farm._id);
    fallbackStore.farms = fallbackStore.farms.filter((farm) => (
      farm.owner !== ownerId && farm.owner !== otherOwnerId
    ));
    fallbackStore.farmPlots = fallbackStore.farmPlots.filter((plot) => (
      plot.owner !== ownerId && plot.owner !== otherOwnerId && !farmIds.includes(plot.farm)
    ));
  });

  const firstFarmResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: makeFarmBody("First Farm")
  }, firstFarmResponse);
  const secondFarmResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: makeFarmBody("Second Farm", { createNew: true })
  }, secondFarmResponse);

  const farmsResponse = createResponse();
  await getMyFarms({ user: { _id: ownerId } }, farmsResponse);
  assert.equal(farmsResponse.body.farms.length, 2);

  const farmId = firstFarmResponse.body.farm._id;
  const plotResponse = createResponse();
  await createFarmPlot({
    user: { _id: ownerId },
    params: { farmId },
    body: { plotName: "North Plot", area: 0.5, areaUnit: "acres", currentCrop: "Maize" }
  }, plotResponse);
  assert.equal(plotResponse.statusCode, 201);

  const updateResponse = createResponse();
  await updateFarmPlot({
    user: { _id: ownerId },
    params: { farmId, plotId: plotResponse.body.plot._id },
    body: { currentCrop: "Beans" }
  }, updateResponse);
  assert.equal(updateResponse.body.plot.currentCrop, "Beans");

  const plotsResponse = createResponse();
  await getFarmPlots({
    user: { _id: ownerId },
    params: { farmId }
  }, plotsResponse);
  assert.equal(plotsResponse.body.plots.length, 1);

  const forbiddenOwnerResponse = createResponse();
  await getFarmPlots({
    user: { _id: otherOwnerId },
    params: { farmId }
  }, forbiddenOwnerResponse);
  assert.equal(forbiddenOwnerResponse.statusCode, 404);
});
