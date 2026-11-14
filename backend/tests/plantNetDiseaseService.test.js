import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

import {
  identifyDisease,
  PlantNetServiceError
} from "../services/plantNetDiseaseService.js";
import { analyzeDisease } from "../controllers/diseaseController.js";

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

test("disease identification sends a leaf image and preserves Pl@ntNet matches", async (t) => {
  const originalPost = axios.post;
  axios.post = async (url, formData, options) => {
    assert.equal(url, "https://my-api.plantnet.org/v2/diseases/identify");
    assert.match(formData.getBuffer().toString("utf8"), /name="images"/);
    assert.match(formData.getBuffer().toString("utf8"), /name="organs"\r\n\r\nleaf/);
    assert.deepEqual(options.params, {
      "api-key": "test-key",
      lang: "en",
      "nb-results": 5
    });

    return {
      data: {
        language: "en",
        results: [{ name: "TEST", description: "Test disease", score: 0.78 }]
      }
    };
  };
  t.after(() => {
    axios.post = originalPost;
  });

  const result = await identifyDisease({
    apiKey: "test-key",
    file: {
      buffer: Buffer.from("image-data"),
      mimetype: "image/jpeg",
      originalname: "leaf.jpg"
    }
  });

  assert.deepEqual(result.results, [
    { name: "TEST", description: "Test disease", score: 0.78 }
  ]);
});

test("disease identification reports the provider request limit", async (t) => {
  const originalPost = axios.post;
  axios.post = async () => {
    throw Object.assign(new Error("Rate limited"), {
      isAxiosError: true,
      response: { status: 429 }
    });
  };
  t.after(() => {
    axios.post = originalPost;
  });

  await assert.rejects(
    identifyDisease({
      apiKey: "test-key",
      file: {
        buffer: Buffer.from("image-data"),
        mimetype: "image/jpeg",
        originalname: "leaf.jpg"
      }
    }),
    (error) => error instanceof PlantNetServiceError
      && error.statusCode === 503
      && /request limit/.test(error.message)
  );
});

test("disease route asks for backend key configuration without exposing credentials", async (t) => {
  const previousKey = process.env.PLANTNET_API_KEY;
  delete process.env.PLANTNET_API_KEY;
  t.after(() => {
    if (previousKey === undefined) {
      delete process.env.PLANTNET_API_KEY;
    } else {
      process.env.PLANTNET_API_KEY = previousKey;
    }
  });

  const response = createResponse();
  await analyzeDisease({
    file: {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: "image/jpeg",
      originalname: "leaf.jpg"
    },
    body: { crop: "Rice" }
  }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /PLANTNET_API_KEY/);
  assert.doesNotMatch(response.body.message, /test-key/);
});

test("disease route rejects an image whose content does not match its MIME type", async () => {
  const response = createResponse();
  await analyzeDisease({
    file: {
      buffer: Buffer.from("not an image"),
      mimetype: "image/jpeg",
      originalname: "leaf.jpg"
    },
    body: { crop: "Rice" }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /valid JPEG or PNG/);
});

test("disease route rejects crop values outside the selection list", async () => {
  const response = createResponse();
  await analyzeDisease({
    file: {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: "image/jpeg",
      originalname: "leaf.jpg"
    },
    body: { crop: "Unsupported crop" }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Choose a crop/);
});
