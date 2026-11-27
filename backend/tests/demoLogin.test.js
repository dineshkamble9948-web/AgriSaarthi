import assert from "node:assert/strict";
import test from "node:test";
import { demoLogin, loginUser } from "../controllers/authController.js";
import { findUserByEmail, setFallbackMode } from "../config/fallbackStore.js";

const setDemoTestEnvironment = (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "demo-test-secret";
  setFallbackMode(true);

  t.after(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }

    setFallbackMode(false);
  });
};

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

test("local demo login creates and reuses an account without registration", async (t) => {
  setDemoTestEnvironment(t);
  const request = { socket: { remoteAddress: "::ffff:127.0.0.1" } };
  const firstResponse = createResponse();
  await demoLogin(request, firstResponse);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.user.email, "demo@agrisaarthi.local");
  assert.ok(firstResponse.body.token);

  const secondResponse = createResponse();
  await demoLogin(request, secondResponse);

  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.user.id, firstResponse.body.user.id);
  assert.ok(findUserByEmail("demo@agrisaarthi.local"));
});

test("demo login is unavailable outside local development", async (t) => {
  setDemoTestEnvironment(t);
  const remoteResponse = createResponse();
  await demoLogin({ socket: { remoteAddress: "192.0.2.10" } }, remoteResponse);
  assert.equal(remoteResponse.statusCode, 404);

  process.env.NODE_ENV = "production";
  const productionResponse = createResponse();
  await demoLogin({ socket: { remoteAddress: "127.0.0.1" } }, productionResponse);
  assert.equal(productionResponse.statusCode, 404);
});

test("standard login with demo credentials (demo@agrisaarthi.local / Password@123) succeeds", async (t) => {
  setDemoTestEnvironment(t);
  const req = {
    body: {
      email: "demo@agrisaarthi.local",
      password: "Password@123"
    }
  };
  const res = createResponse();
  await loginUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.email, "demo@agrisaarthi.local");
  assert.ok(res.body.token);
});
