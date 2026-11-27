import assert from "node:assert/strict";
import test from "node:test";

import {
  createUser,
  createFarmEntry,
  createFarmPlotEntry,
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import { getUnifiedPlotDashboard } from "../controllers/dashboardController.js";
import { listSchemes, getSchemeDetails } from "../controllers/schemeController.js";
import { listOfficers } from "../controllers/officerController.js";
import { getFarmingCalendar, toggleCalendarTask } from "../controllers/farmingCalendarController.js";
import { getPlotHealthReport } from "../controllers/reportController.js";
import { getAllKarnatakaSchemes, matchPersonalizedSchemes } from "../services/governmentSchemesService.js";
import { getKarnatakaAgriculturalOfficers } from "../services/agriculturalOfficersService.js";
import { generateFarmingCalendar } from "../services/farmingCalendarService.js";

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

test("Phase 5: Unified Plot Dashboard aggregates plot, soil, weather, calendar, and health", async (t) => {
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const user = createUser({
    name: "Basavaraj Patil",
    email: "patil.b@example.com",
    state: "Karnataka",
    district: "Raichur"
  });

  const farm = createFarmEntry({
    farmer: user.id,
    name: "Patil Organic Farm",
    location: {
      type: "Point",
      coordinates: [77.34, 16.20],
      address: "Sindhanur, Raichur"
    }
  });

  const plot = createFarmPlotEntry(user.id, farm.id, {
    plotName: "Plot 1 - North Cotton",
    name: "Plot 1 - North Cotton",
    area: { value: 3.5, unit: "acres" },
    soilType: "Black Soil",
    crop: {
      current: "Cotton",
      variety: "Bt-Cotton",
      stage: "vegetative",
      sowingDate: "2026-06-20"
    },
    irrigationType: "drip",
    centerCoordinate: { latitude: 16.20, longitude: 77.34 }
  });

  const req = {
    user: { _id: user.id },
    params: { plotId: plot.id }
  };
  const res = mockResponse();

  await getUnifiedPlotDashboard(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.plot.id, plot.id);
  assert.equal(res.payload.data.plot.name, "Plot 1 - North Cotton");
  assert.ok(res.payload.data.soil !== undefined);
  assert.ok(res.payload.data.weather !== undefined);
  assert.ok(res.payload.data.fertilizer !== undefined);
  assert.ok(res.payload.data.irrigation !== undefined);
  assert.ok(Array.isArray(res.payload.data.alerts));
});

test("Phase 6: Government Schemes service provides verified Karnataka schemes and personalization", async () => {
  const schemes = getAllKarnatakaSchemes();
  assert.ok(schemes.length >= 7, "Should include at least 7 major schemes");

  const pmKisan = schemes.find((s) => s.id === "pm-kisan");
  assert.ok(pmKisan, "PM-KISAN scheme must exist");
  assert.equal(pmKisan.state, "All India");

  const raithaSiri = schemes.find((s) => s.id === "raitha-siri");
  assert.ok(raithaSiri, "Raitha Siri scheme must exist");
  assert.equal(raithaSiri.state, "Karnataka");

  const krishiBhagya = schemes.find((s) => s.id === "krishi-bhagya");
  assert.ok(krishiBhagya, "Krishi Bhagya scheme must exist");

  // Personalization matching
  const matched = matchPersonalizedSchemes({
    state: "Karnataka",
    district: "Raichur",
    landArea: 3,
    crop: "Millets"
  });

  assert.ok(matched.length > 0);
  const matchedRaithaSiri = matched.find((m) => m.id === "raitha-siri");
  assert.ok(matchedRaithaSiri);
  assert.equal(matchedRaithaSiri.isEligible, true);
});

test("Phase 6: Scheme API endpoints return filtered lists and specific scheme detail", async () => {
  const reqAll = { query: {} };
  const resAll = mockResponse();
  await listSchemes(reqAll, resAll);
  assert.equal(resAll.statusCode, 200);
  assert.ok(resAll.payload.total >= 7);

  const reqDetail = { params: { id: "pm-kisan" } };
  const resDetail = mockResponse();
  await getSchemeDetails(reqDetail, resDetail);
  assert.equal(resDetail.statusCode, 200);
  assert.equal(resDetail.payload.data.name, "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)");
  assert.ok(resDetail.payload.data.officialPortal.includes("pmkisan.gov.in"));
});

test("Phase 7: Agricultural Officers Directory provides verified Karnataka RSK and KVK contacts", async () => {
  const officers = getKarnatakaAgriculturalOfficers({ district: "Raichur" });
  assert.ok(officers.length > 0, "Must return officers for Raichur");
  
  const rsk = officers.find((o) => o.taluk === "Raichur" || o.name.includes("Raichur"));
  assert.ok(rsk);
  assert.ok(rsk.phone, "Officer must have phone contact");
  assert.ok(rsk.directionsUrl, "Officer must have map directions link");

  // Endpoint test
  const req = { query: { district: "Raichur" } };
  const res = mockResponse();
  await listOfficers(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.total > 0);
});

test("Phase 8: Farming Calendar generates verified package-of-practices timeline and supports task toggle", async (t) => {
  const calendar = generateFarmingCalendar({
    crop: "Cotton",
    variety: "Bt Cotton",
    sowingDate: "2026-06-15"
  });

  assert.equal(calendar.crop, "Cotton");
  assert.ok(calendar.stages.length >= 4, "Should have multiple crop stages");
  assert.ok(calendar.totalDays > 100, "Cotton growth duration should span >100 days");

  const sowingStage = calendar.stages.find((s) => s.stageName.toLowerCase().includes("sowing") || s.stageName.toLowerCase().includes("field"));
  assert.ok(sowingStage);
  assert.ok(sowingStage.tasks.length > 0);

  // Toggle API test
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const reqToggle = {
    user: { _id: "user_test_1" },
    body: {
      plotId: "plot_test_1",
      taskId: "task_land_prep",
      completed: true
    }
  };
  const resToggle = mockResponse();
  await toggleCalendarTask(reqToggle, resToggle);
  assert.equal(resToggle.statusCode, 200);
  assert.equal(resToggle.payload.success, true);
  assert.equal(resToggle.payload.completed, true);
});

test("Phase 9: Farm Health Report produces comprehensive printable assessment", async (t) => {
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const user = createUser({
    name: "Sharanappa",
    email: "sharan@example.com",
    state: "Karnataka",
    district: "Kalaburagi"
  });

  const farm = createFarmEntry({
    farmer: user.id,
    name: "Sharanappa Farm"
  });

  const plot = createFarmPlotEntry(user.id, farm.id, {
    plotName: "Pigeonpea East Field",
    name: "Pigeonpea East Field",
    area: { value: 4, unit: "acres" },
    soilType: "Black Soil",
    crop: {
      current: "Pigeonpea",
      stage: "flowering"
    },
    centerCoordinate: { latitude: 17.33, longitude: 76.83 }
  });

  const req = {
    user: { _id: user.id },
    params: { plotId: plot.id }
  };
  const res = mockResponse();

  await getPlotHealthReport(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.ok(res.payload.data.reportId.startsWith("REP-"));
  assert.equal(res.payload.data.printable, true);
  assert.ok(res.payload.data.healthScore >= 0 && res.payload.data.healthScore <= 100);
  assert.ok(Array.isArray(res.payload.data.actionPlan));
});
