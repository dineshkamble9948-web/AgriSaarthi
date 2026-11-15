import assert from "node:assert/strict";
import test from "node:test";

import fallbackStore, {
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import {
  acknowledgeFarmAlert,
  getFarmAlerts
} from "../controllers/farmAlertController.js";
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

test("farm alerts persist, are owner-scoped, and retain acknowledgement", async (t) => {
  const ownerId = "farm-alert-test-owner";
  const otherOwnerId = "farm-alert-other-owner";
  const wasFallbackMode = isFallbackMode();
  setFallbackMode(true);
  t.after(() => {
    setFallbackMode(wasFallbackMode);
    const farmIds = fallbackStore.farms
      .filter((farm) => [ownerId, otherOwnerId].includes(farm.owner))
      .map((farm) => farm._id);
    fallbackStore.farms = fallbackStore.farms.filter((farm) => (
      ![ownerId, otherOwnerId].includes(farm.owner)
    ));
    fallbackStore.weatherHistory = fallbackStore.weatherHistory.filter((item) => item.owner !== ownerId);
    fallbackStore.farmAlerts = fallbackStore.farmAlerts.filter((item) => (
      item.owner !== ownerId && !farmIds.includes(item.farm)
    ));
  });

  const farmResponse = createResponse();
  await saveFarm({
    user: { _id: ownerId },
    body: {
      farmName: "Alert Test Farm",
      location: "Test Village",
      state: "Karnataka",
      area: 1,
      areaUnit: "acres",
      soilType: "Red"
    }
  }, farmResponse);
  const farmId = farmResponse.body.farm._id;
  fallbackStore.weatherHistory.push({
    owner: ownerId,
    farm: farmId,
    sourceFetchedAt: new Date().toISOString(),
    weather: {
      alerts: [{
        type: "heavy_rain",
        severity: "warning",
        title: "Heavy rainfall possible",
        message: "Forecast rainfall is above the planning threshold."
      }]
    }
  });

  const alertsResponse = createResponse();
  await getFarmAlerts({
    user: { _id: ownerId },
    params: { farmId }
  }, alertsResponse);
  assert.equal(alertsResponse.statusCode, 200);
  assert.equal(alertsResponse.body.alerts.length, 1);
  const alert = alertsResponse.body.alerts[0];
  assert.equal(alert.source, "OpenWeather forecast");

  const acknowledgeResponse = createResponse();
  await acknowledgeFarmAlert({
    user: { _id: ownerId },
    params: { farmId, alertId: alert._id }
  }, acknowledgeResponse);
  assert.equal(acknowledgeResponse.statusCode, 200);
  assert.ok(acknowledgeResponse.body.alert.acknowledgedAt);

  const refreshedResponse = createResponse();
  await getFarmAlerts({
    user: { _id: ownerId },
    params: { farmId }
  }, refreshedResponse);
  assert.ok(refreshedResponse.body.alerts[0].acknowledgedAt);

  const forbiddenResponse = createResponse();
  await getFarmAlerts({
    user: { _id: otherOwnerId },
    params: { farmId }
  }, forbiddenResponse);
  assert.equal(forbiddenResponse.statusCode, 404);
});
