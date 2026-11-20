import test from "node:test";
import assert from "node:assert/strict";
import { isStrongPassword, registerUser } from "../controllers/authController.js";
import { reverseGeocode } from "../services/reverseGeocodeService.js";

test("isStrongPassword requires all 5 password rules", () => {
  // Valid passwords
  assert.equal(isStrongPassword("Agri@2026"), true);
  assert.equal(isStrongPassword("Kisan#Pass1"), true);
  assert.equal(isStrongPassword("Farm$Mart99"), true);

  // Invalid: too short (< 8 chars)
  assert.equal(isStrongPassword("Ag@1a"), false);

  // Invalid: missing uppercase
  assert.equal(isStrongPassword("agri@2026"), false);

  // Invalid: missing lowercase
  assert.equal(isStrongPassword("AGRI@2026"), false);

  // Invalid: missing number
  assert.equal(isStrongPassword("Agri@Saarthi"), false);

  // Invalid: missing special character
  assert.equal(isStrongPassword("AgriSaarthi2026"), false);

  // Invalid: only numbers
  assert.equal(isStrongPassword("1234567890"), false);

  // Invalid: only letters
  assert.equal(isStrongPassword("AgriSaarthiFarm"), false);
});

test("reverseGeocode validates coordinate boundary ranges", async () => {
  await assert.rejects(
    () => reverseGeocode(95.0, 77.0),
    /Invalid latitude/
  );
  await assert.rejects(
    () => reverseGeocode(12.0, 185.0),
    /Invalid latitude/
  );
});

test("reverseGeocode successfully resolves coordinates to address structure", async () => {
  // Test with Bangalore coordinates (12.9716, 77.5946)
  const result = await reverseGeocode(12.9716, 77.5946);
  assert.equal(result.success, true);
  assert.equal(typeof result.state, "string");
  assert.equal(typeof result.district, "string");
  assert.equal(typeof result.city, "string");
  assert.equal(typeof result.pincode, "string");
  assert.equal(result.latitude, 12.9716);
  assert.equal(result.longitude, 77.5946);
});
