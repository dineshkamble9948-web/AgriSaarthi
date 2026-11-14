import axios from "axios";
import FormData from "form-data";

const API_BASE_URL = "https://my-api.plantnet.org/v2/diseases";
const REQUEST_TIMEOUT_MS = 20000;

export class PlantNetServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "PlantNetServiceError";
    this.statusCode = statusCode;
  }
}

const providerError = (error) => {
  const status = error.response?.status;

  if (status === 429) {
    return new PlantNetServiceError(
      "Pl@ntNet's request limit has been reached. Please try again later.",
      503
    );
  }
  if (status === 401 || status === 403) {
    return new PlantNetServiceError(
      "Pl@ntNet rejected the server API key. Check PLANTNET_API_KEY in backend/.env.",
      503
    );
  }
  if (status === 400 || status === 422) {
    return new PlantNetServiceError(
      "Pl@ntNet could not analyze this image. Upload a clear JPEG or PNG image of a supported plant.",
      400
    );
  }
  if (status) {
    return new PlantNetServiceError(
      "Pl@ntNet is temporarily unable to process the request. Please try again.",
      status >= 500 ? 502 : 503
    );
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new PlantNetServiceError("Pl@ntNet timed out. Please try again.", 504);
  }
  return new PlantNetServiceError(
    "Could not connect to Pl@ntNet. Please try again.",
    502
  );
};

const requestFromPlantNet = async (request) => {
  try {
    return await request();
  } catch (error) {
    if (error instanceof PlantNetServiceError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      throw providerError(error);
    }
    throw error;
  }
};

export const getDiseaseCatalog = async (apiKey) => {
  const response = await requestFromPlantNet(() => axios.get(API_BASE_URL, {
    params: { "api-key": apiKey },
    timeout: REQUEST_TIMEOUT_MS
  }));

  if (!Array.isArray(response.data)) {
    throw new PlantNetServiceError("Pl@ntNet returned an invalid disease catalog.", 502);
  }

  return response.data;
};

export const identifyDisease = async ({ file, apiKey }) => {
  const formData = new FormData();
  formData.append("images", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });
  formData.append("organs", "leaf");

  const response = await requestFromPlantNet(() => axios.post(
    `${API_BASE_URL}/identify`,
    formData,
    {
      headers: formData.getHeaders(),
      params: {
        "api-key": apiKey,
        lang: "en",
        "nb-results": 5
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxBodyLength: 6 * 1024 * 1024
    }
  ));

  if (!response.data || !Array.isArray(response.data.results)) {
    throw new PlantNetServiceError("Pl@ntNet returned an invalid identification result.", 502);
  }

  return response.data;
};
