import assert from "node:assert/strict";
import test from "node:test";

import {
  createUser,
  createFarmEntry,
  createFarmPlotEntry,
  findFarmPlotById,
  deleteFarmPlotEntry,
  updateUserProfile,
  listFarmPlots,
  isFallbackMode,
  setFallbackMode
} from "../config/fallbackStore.js";
import {
  createFarmPlot,
  getFarmPlots,
  getFarmPlotById,
  updateFarmPlot,
  deleteFarmPlot
} from "../controllers/farmController.js";
import {
  updateProfile,
  getMe
} from "../controllers/authController.js";

test("Phase 1: Farmer profile update and retrieval persists complete details", async (t) => {
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const user = createUser({
    name: "Ramesh Gowda",
    email: "ramesh.gowda@example.com",
    password: "Password@123",
    state: "Karnataka",
    district: "Raichur"
  });

  const req = {
    user: { _id: user.id },
    body: {
      name: "Ramesh H. Gowda",
      phoneNumber: "9845012345",
      preferredLanguage: "kn",
      state: "Karnataka",
      district: "Raichur",
      taluk: "Manvi",
      village: "Sirwar",
      pincode: "584143",
      farmLocation: "Survey No 42, Sirwar",
      totalLandArea: 5.5,
      farmingHistory: [{ year: 2024, crop: "Cotton", yieldQuintals: 24 }]
    }
  };

  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await updateProfile(req, res);

  assert.equal(statusCode, 200);
  assert.equal(responseData.success, true);
  assert.equal(responseData.user.name, "Ramesh H. Gowda");
  assert.equal(responseData.user.phoneNumber, "9845012345");
  assert.equal(responseData.user.preferredLanguage, "kn");
  assert.equal(responseData.user.taluk, "Manvi");
  assert.equal(responseData.user.totalLandArea, 5.5);
  assert.equal(responseData.user.farmingHistory.length, 1);
});

test("Phase 1: Multiple plots management with full CRUD and authorization checks", async (t) => {
  const wasFallback = isFallbackMode();
  setFallbackMode(true);
  t.after(() => setFallbackMode(wasFallback));

  const owner = createUser({
    name: "Basavaraj",
    email: "basavaraj@example.com",
    password: "Password@123"
  });
  const intruder = createUser({
    name: "Malicious User",
    email: "intruder@example.com",
    password: "Password@123"
  });

  const farm = createFarmEntry(owner.id, {
    farmName: "Green Valley Farm",
    location: "Raichur",
    state: "Karnataka",
    district: "Raichur",
    area: 10,
    areaUnit: "acres"
  });

  // 1. Create Plot
  const createReq = {
    user: { _id: owner.id },
    params: { farmId: farm.id },
    body: {
      plotName: "North Cotton Field",
      soilType: "Deep Black",
      currentCrop: "Cotton",
      previousCrops: ["Pigeonpea", "Sorghum"],
      locationName: "Plot A, Near Canal",
      latitude: 16.205,
      longitude: 77.355,
      area: 3.5,
      areaUnit: "acres",
      irrigationType: "Drip"
    }
  };

  let createResCode = 200;
  let createResData = null;
  const createRes = {
    status(code) {
      createResCode = code;
      return this;
    },
    json(data) {
      createResData = data;
      return this;
    }
  };

  await createFarmPlot(createReq, createRes);
  assert.equal(createResCode, 201);
  assert.equal(createResData.success, true);
  assert.equal(createResData.plot.plotName, "North Cotton Field");
  assert.equal(createResData.plot.soilType, "Deep Black");
  assert.ok(createResData.plot.previousCrops.includes("Pigeonpea"));

  const plotId = createResData.plot._id || createResData.plot.id;

  // 2. Intruder should NOT be able to view owner's plot
  const intruderGetReq = {
    user: { _id: intruder.id },
    params: { farmId: farm.id, plotId }
  };
  let intruderCode = 200;
  let intruderData = null;
  const intruderRes = {
    status(code) {
      intruderCode = code;
      return this;
    },
    json(data) {
      intruderData = data;
      return this;
    }
  };
  await getFarmPlotById(intruderGetReq, intruderRes);
  assert.equal(intruderCode, 404);
  assert.equal(intruderData.success, false);

  // 3. Owner gets plot details
  const ownerGetReq = {
    user: { _id: owner.id },
    params: { farmId: farm.id, plotId }
  };
  let ownerGetCode = 200;
  let ownerGetData = null;
  const ownerGetRes = {
    status(code) {
      ownerGetCode = code;
      return this;
    },
    json(data) {
      ownerGetData = data;
      return this;
    }
  };
  await getFarmPlotById(ownerGetReq, ownerGetRes);
  assert.equal(ownerGetCode, 200);
  assert.equal(ownerGetData.plot.plotName, "North Cotton Field");

  // 4. Update plot
  const updateReq = {
    user: { _id: owner.id },
    params: { farmId: farm.id, plotId },
    body: {
      plotName: "North Cotton Field (Updated)",
      currentCrop: "Bt Cotton"
    }
  };
  let updateCode = 200;
  let updateData = null;
  const updateRes = {
    status(code) {
      updateCode = code;
      return this;
    },
    json(data) {
      updateData = data;
      return this;
    }
  };
  await updateFarmPlot(updateReq, updateRes);
  assert.equal(updateCode, 200);
  assert.equal(updateData.plot.plotName, "North Cotton Field (Updated)");
  assert.equal(updateData.plot.currentCrop, "Bt Cotton");

  // 5. Delete plot
  const deleteReq = {
    user: { _id: owner.id },
    params: { farmId: farm.id, plotId }
  };
  let deleteCode = 200;
  let deleteData = null;
  const deleteRes = {
    status(code) {
      deleteCode = code;
      return this;
    },
    json(data) {
      deleteData = data;
      return this;
    }
  };
  await deleteFarmPlot(deleteReq, deleteRes);
  assert.equal(deleteCode, 200);
  assert.equal(deleteData.success, true);
});
