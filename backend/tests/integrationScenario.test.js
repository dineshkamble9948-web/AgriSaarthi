import test from "node:test";
import assert from "node:assert/strict";
import { registerUser, loginUser, updateLocation, reverseGeocodeEndpoint, getMe, isStrongPassword } from "../controllers/authController.js";
import { saveFarm, getMyFarm } from "../controllers/farmController.js";
import { getWeather } from "../controllers/weatherController.js";
import { setFallbackMode, findUserByEmail, isFallbackMode } from "../config/fallbackStore.js";
import { reverseGeocode } from "../services/reverseGeocodeService.js";

const mockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

test("1 & 2: Registration password validation (valid vs invalid)", async () => {
  setFallbackMode(true);

  // Invalid: short
  const resShort = mockResponse();
  await registerUser({ body: { name: "Test Farmer", email: "test1@example.com", password: "Ab1@" } }, resShort);
  assert.equal(resShort.statusCode, 400);
  assert.match(resShort.body.message, /Password must be at least 8 characters/);

  // Invalid: only digits
  const resDigits = mockResponse();
  await registerUser({ body: { name: "Test Farmer", email: "test2@example.com", password: "123456789012" } }, resDigits);
  assert.equal(resDigits.statusCode, 400);

  // Invalid: no uppercase
  const resNoUpper = mockResponse();
  await registerUser({ body: { name: "Test Farmer", email: "test3@example.com", password: "farmer@1234" } }, resNoUpper);
  assert.equal(resNoUpper.statusCode, 400);

  // Valid password
  const resValid = mockResponse();
  await registerUser({ body: { name: "Dinesh Farmer", email: "dinesh_valid@example.com", password: "KisanSecure#2026" } }, resValid);
  assert.equal(resValid.statusCode, 201);
  assert.equal(resValid.body.success, true);
  assert.ok(resValid.body.token);
  assert.equal(resValid.body.user.email, "dinesh_valid@example.com");
  // Security check: Never expose password or hash in response
  assert.equal(resValid.body.user.password, undefined);
  assert.equal(resValid.body.user.passwordHash, undefined);
});

test("3: Login with correct and incorrect credentials", async () => {
  setFallbackMode(true);

  // Incorrect password
  const resWrong = mockResponse();
  await loginUser({ body: { email: "dinesh_valid@example.com", password: "WrongPassword#99" } }, resWrong);
  assert.equal(resWrong.statusCode, 401);
  assert.match(resWrong.body.message, /Invalid email or password/i);

  // Correct credentials
  const resCorrect = mockResponse();
  await loginUser({ body: { email: "dinesh_valid@example.com", password: "KisanSecure#2026" } }, resCorrect);
  assert.equal(resCorrect.statusCode, 200);
  assert.equal(resCorrect.body.success, true);
  assert.ok(resCorrect.body.token);
  assert.equal(resCorrect.body.user.name, "Dinesh Farmer");
});

test("4 & 5: Location detection & reverse geocoding to state, district, city, village, pincode", async () => {
  // Coordinates for Bangalore / Yelahanka area
  const lat = 13.1007;
  const lon = 77.5963;
  const address = await reverseGeocode(lat, lon);

  assert.ok(address.state, "State should be resolved");
  assert.ok(address.district || address.city, "District or City should be resolved");
  assert.equal(address.latitude, lat);
  assert.equal(address.longitude, lon);
});

test("6: Saving location information to user profile", async () => {
  setFallbackMode(true);

  const existingUser = findUserByEmail("dinesh_valid@example.com");
  assert.ok(existingUser, "User should exist in store");

  const req = {
    user: { _id: existingUser._id },
    body: {
      state: "Karnataka",
      district: "Bengaluru Urban",
      village: "Yelahanka Hobli",
      city: "Bengaluru",
      pincode: "560064",
      latitude: 13.1007,
      longitude: 77.5963
    }
  };
  const res = mockResponse();
  await updateLocation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.village, "Yelahanka Hobli");
  assert.equal(res.body.user.district, "Bengaluru Urban");
  assert.equal(res.body.user.state, "Karnataka");
  assert.equal(res.body.user.latitude, 13.1007);
  assert.equal(res.body.user.longitude, 77.5963);
});

test("7: Retrieving saved location after logging in again", async () => {
  setFallbackMode(true);

  const resLogin = mockResponse();
  await loginUser({ body: { email: "dinesh_valid@example.com", password: "KisanSecure#2026" } }, resLogin);

  assert.equal(resLogin.statusCode, 200);
  assert.equal(resLogin.body.user.village, "Yelahanka Hobli");
  assert.equal(resLogin.body.user.district, "Bengaluru Urban");
  assert.equal(resLogin.body.user.latitude, 13.1007);
  assert.equal(resLogin.body.user.longitude, 77.5963);

  // Also via getMe endpoint (which receives req.user from authMiddleware)
  const userInStore = findUserByEmail("dinesh_valid@example.com");
  const resMe = mockResponse();
  await getMe({ user: userInStore }, resMe);
  assert.equal(resMe.statusCode, 200);
  assert.equal(resMe.body.user.district, "Bengaluru Urban");
  assert.equal(resMe.body.user.village, "Yelahanka Hobli");
});

test("8: Farm creation syncs with location & weather access coordinates", async () => {
  setFallbackMode(true);
  const existingUser = findUserByEmail("dinesh_valid@example.com");

  // Save farm with location & coordinates
  const resFarm = mockResponse();
  await saveFarm({
    user: { _id: existingUser._id },
    body: {
      farmName: "Dinesh Organic Green Farm",
      location: "Yelahanka Farmland",
      state: "Karnataka",
      district: "Bengaluru Urban",
      village: "Yelahanka Hobli",
      city: "Bengaluru",
      pincode: "560064",
      area: 4.5,
      areaUnit: "acres",
      soilType: "Red",
      latitude: 13.1007,
      longitude: 77.5963
    }
  }, resFarm);

  assert.equal(resFarm.statusCode, 200);
  assert.equal(resFarm.body.farm.latitude, 13.1007);
  assert.equal(resFarm.body.farm.longitude, 77.5963);
  assert.equal(resFarm.body.farm.district, "Bengaluru Urban");

  // Retrieve farm for user
  const resGetFarm = mockResponse();
  await getMyFarm({ user: { _id: existingUser._id } }, resGetFarm);
  assert.equal(resGetFarm.statusCode, 200);
  assert.equal(resGetFarm.body.farm.latitude, 13.1007);
});

test("9: Manual location entry without GPS", async () => {
  setFallbackMode(true);
  const existingUser = findUserByEmail("dinesh_valid@example.com");

  // User manually edits state, district, village, pincode without GPS coordinates
  const resManual = mockResponse();
  await updateLocation({
    user: { _id: existingUser._id },
    body: {
      state: "Maharashtra",
      district: "Pune",
      village: "Baramati",
      city: "Baramati",
      pincode: "413102",
      latitude: null,
      longitude: null
    }
  }, resManual);

  assert.equal(resManual.statusCode, 200);
  assert.equal(resManual.body.user.district, "Pune");
  assert.equal(resManual.body.user.village, "Baramati");
  assert.equal(resManual.body.user.state, "Maharashtra");
  assert.equal(resManual.body.user.pincode, "413102");
});
