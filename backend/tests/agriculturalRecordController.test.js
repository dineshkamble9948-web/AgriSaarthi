import assert from "node:assert/strict";
import test from "node:test";

import fallbackStore, {
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import { createRecord, getRecords } from "../controllers/agriculturalRecordController.js";
import { saveFarm } from "../controllers/farmController.js";

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

const farmBody = (farmName, createNew = false) => ({
  farmName,
  location: "Test Village",
  state: "Karnataka",
  area: 1,
  areaUnit: "acres",
  soilType: "Red",
  ...(createNew ? { createNew: true } : {})
});

test("agricultural records can be created and listed for one owner-scoped farm", async (t) => {
  const ownerId = "agricultural-record-farm-scope-test-owner";
  const otherOwnerId = "agricultural-record-other-owner";
  const wasFallbackMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => {
    setFallbackMode(wasFallbackMode);
    const owners = [ownerId, otherOwnerId];
    const farmIds = fallbackStore.farms
      .filter((farm) => owners.includes(farm.owner))
      .map((farm) => farm._id);
    fallbackStore.farms = fallbackStore.farms.filter((farm) => !owners.includes(farm.owner));
    fallbackStore.records = fallbackStore.records.filter((record) => (
      !owners.includes(record.owner) && !farmIds.includes(record.farm)
    ));
  });

  const firstFarmResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: farmBody("North farm")
  }, firstFarmResponse);
  const secondFarmResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: farmBody("South farm", true)
  }, secondFarmResponse);
  const firstFarmId = firstFarmResponse.body.farm._id;
  const secondFarmId = secondFarmResponse.body.farm._id;

  for (const farmId of [firstFarmId, secondFarmId]) {
    const response = createResponse();
    await createRecord({
      user: { _id: ownerId },
      body: {
        farmId,
        activityType: "Irrigation",
        cropName: "Maize",
        date: "2026-04-15",
        quantity: 3,
        unit: "hours"
      }
    }, response);
    assert.equal(response.statusCode, 201);
  }

  const farmRecordsResponse = createResponse();
  await getRecords({
    user: { _id: ownerId },
    query: { farmId: firstFarmId, activityType: "Irrigation" }
  }, farmRecordsResponse);
  assert.equal(farmRecordsResponse.statusCode, 200);
  assert.equal(farmRecordsResponse.body.count, 1);
  assert.equal(farmRecordsResponse.body.records[0].farm, firstFarmId);

  const otherOwnerResponse = createResponse();
  await createRecord({
    user: { _id: otherOwnerId },
    body: {
      farmId: firstFarmId,
      activityType: "Irrigation",
      cropName: "Maize",
      date: "2026-04-15"
    }
  }, otherOwnerResponse);
  assert.equal(otherOwnerResponse.statusCode, 404);
});
