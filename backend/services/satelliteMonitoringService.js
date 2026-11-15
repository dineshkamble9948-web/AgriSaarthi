const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STATISTICS_URL = "https://sh.dataspace.copernicus.eu/statistics/v1";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1";
const REQUEST_TIMEOUT_MS = 25000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const monitoringCache = new Map();
const DAY_MS = 24 * 60 * 60 * 1000;
const CRS84 = "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

const NDVI_STATISTICS_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "NDVI", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;
  const valid = sample.dataMask
    * (denominator === 0 ? 0 : 1)
    * ([3, 6, 8, 9, 10, 11].includes(sample.SCL) ? 0 : 1);
  const ndvi = denominator === 0 ? 0 : (sample.B08 - sample.B04) / denominator;
  return { NDVI: [ndvi], dataMask: [valid] };
}`;

const NDVI_IMAGE_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { id: "default", bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;
  const valid = sample.dataMask
    * (denominator === 0 ? 0 : 1)
    * ([3, 6, 8, 9, 10, 11].includes(sample.SCL) ? 0 : 1);
  const ndvi = denominator === 0 ? -1 : (sample.B08 - sample.B04) / denominator;
  let color = [0.55, 0.36, 0.24];
  if (ndvi >= 0.5) color = [0.08, 0.55, 0.18];
  else if (ndvi >= 0.2) color = [0.88, 0.72, 0.12];
  return [color[0], color[1], color[2], valid];
}`;

export class SatelliteProviderError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "SatelliteProviderError";
    this.statusCode = statusCode;
  }
}

export class SatelliteDataProvider {
  async getMonitoring() {
    throw new Error("Satellite data providers must implement getMonitoring().");
  }
}

const dateOnly = (date) => date.toISOString().slice(0, 10);

export const defaultMonitoringPeriod = (now = new Date()) => {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to.getTime() - 90 * DAY_MS);
  return {
    from: `${dateOnly(from)}T00:00:00Z`,
    to: `${dateOnly(to)}T00:00:00Z`
  };
};

const summarizeStatistics = (payload) => {
  if (!Array.isArray(payload?.data)) {
    throw new SatelliteProviderError("Copernicus returned an invalid NDVI statistics response.");
  }

  const ndviSeries = payload.data
    .map((item) => {
      const stats = item?.outputs?.NDVI?.bands?.B0?.stats;
      const mean = Number(stats?.mean);
      if (!Number.isFinite(mean) || mean < -1 || mean > 1) {
        return null;
      }

      return {
        date: item.interval?.from || null,
        intervalEnd: item.interval?.to || null,
        mean: Math.round(mean * 1000) / 1000,
        validPixelCount: Number.isFinite(Number(stats.sampleCount))
          ? Number(stats.sampleCount)
          : null
      };
    })
    .filter((item) => item?.date)
    .sort((left, right) => new Date(left.date) - new Date(right.date));

  if (ndviSeries.length === 0) {
    throw new SatelliteProviderError(
      "No usable Sentinel-2 observations were found for this farm and date range. Try another date range or check boundary coverage.",
      404
    );
  }

  const latest = ndviSeries[ndviSeries.length - 1];
  const classification = latest.mean < 0.2
    ? "poor"
    : latest.mean < 0.5
      ? "moderate"
      : "healthy";

  return {
    ndviSeries,
    latestNDVI: latest.mean,
    latestObservation: latest.date,
    classification
  };
};

const fetchWithTimeout = async (url, options, requestName) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new SatelliteProviderError(`Copernicus ${requestName} request timed out.`, 504);
    }
    throw new SatelliteProviderError(`Could not connect to Copernicus ${requestName}.`, 502);
  } finally {
    clearTimeout(timeout);
  }
};

export class SentinelHubProvider extends SatelliteDataProvider {
  constructor(credentials = {}) {
    super();
    this.credentials = credentials;
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  getCredentials() {
    return {
      clientId: this.credentials.clientId ?? process.env.CDSE_CLIENT_ID?.trim(),
      clientSecret: this.credentials.clientSecret ?? process.env.CDSE_CLIENT_SECRET?.trim()
    };
  }

  async getAccessToken() {
    const credentials = this.getCredentials();
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new SatelliteProviderError(
        "Satellite monitoring is not configured. Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in backend/.env.",
        503
      );
    }
    if (this.token && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.token;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    });
    const response = await fetchWithTimeout(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }, "authentication");

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new SatelliteProviderError("Copernicus authentication returned an invalid response.", 502);
    }
    if (!response.ok || typeof payload.access_token !== "string" || !payload.access_token) {
      const statusCode = response.status === 401 || response.status === 403 ? 503 : 502;
      throw new SatelliteProviderError(
        "Copernicus rejected authentication. Verify the CDSE OAuth client credentials.",
        statusCode
      );
    }

    this.token = payload.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(60, Number(payload.expires_in) || 300) * 1000;
    return this.token;
  }

  async requestJson(url, token, body, requestName) {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    }, requestName);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new SatelliteProviderError("Copernicus denied access to the satellite data request.", 503);
      }
      if (response.status === 429 || response.status >= 500) {
        throw new SatelliteProviderError("Copernicus satellite services are temporarily unavailable.", 503);
      }
      throw new SatelliteProviderError("Copernicus could not process the satellite data request.", 502);
    }

    try {
      return await response.json();
    } catch {
      throw new SatelliteProviderError("Copernicus returned invalid satellite statistics.", 502);
    }
  }

  async requestImage(token, geometry, period) {
    const response = await fetchWithTimeout(PROCESS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      body: JSON.stringify({
        input: {
          bounds: {
            properties: { crs: CRS84 },
            geometry
          },
          data: [{
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: period,
              maxCloudCoverage: 30,
              mosaickingOrder: "leastCC"
            }
          }]
        },
        output: {
          width: 512,
          height: 512,
          responses: [{
            identifier: "default",
            format: { type: "image/png" }
          }]
        },
        evalscript: NDVI_IMAGE_EVALSCRIPT
      })
    }, "imagery");

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new SatelliteProviderError("Copernicus denied access to satellite imagery.", 503);
      }
      throw new SatelliteProviderError("Sentinel-2 imagery is unavailable for this period.", 503);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("image/png")) {
      throw new SatelliteProviderError("Copernicus returned an unsupported satellite image format.", 502);
    }
    const imageBytes = Buffer.from(await response.arrayBuffer());
    if (imageBytes.length === 0) {
      throw new SatelliteProviderError("Copernicus returned an empty satellite image.", 502);
    }
    return `data:image/png;base64,${imageBytes.toString("base64")}`;
  }

  async getMonitoring({ geometry, period }) {
    const token = await this.getAccessToken();
    const statistics = await this.requestJson(STATISTICS_URL, token, {
      input: {
        bounds: {
          properties: { crs: CRS84 },
          geometry
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: period,
            maxCloudCoverage: 30,
            mosaickingOrder: "leastCC"
          }
        }]
      },
      aggregation: {
        timeRange: period,
        aggregationInterval: { of: "P10D" },
        evalscript: NDVI_STATISTICS_EVALSCRIPT,
        resx: 10,
        resy: 10
      }
    }, "NDVI statistics");
    const summary = summarizeStatistics(statistics);
    const latest = summary.ndviSeries[summary.ndviSeries.length - 1];
    const imagePeriod = {
      from: latest.date,
      to: latest.intervalEnd || period.to
    };

    let imagery = { status: "unavailable", dataUri: null, message: "" };
    try {
      imagery = {
        status: "available",
        dataUri: await this.requestImage(token, geometry, imagePeriod),
        message: ""
      };
    } catch (error) {
      if (!(error instanceof SatelliteProviderError)) {
        throw error;
      }
      imagery.message = error.message;
    }

    return {
      source: "Sentinel-2 L2A / Copernicus Data Space",
      retrievedAt: new Date().toISOString(),
      period,
      areaSource: null,
      ...summary,
      imagery,
      classificationNote: "Generic NDVI thresholds (poor < 0.20, moderate 0.20–0.49, healthy ≥ 0.50); not crop-specific."
    };
  }
}

const sentinelHubProvider = new SentinelHubProvider();

export const getSentinelMonitoring = async ({
  geometry,
  period = defaultMonitoringPeriod(),
  areaSource
}, provider = sentinelHubProvider) => {
  const cacheKey = JSON.stringify({ geometry, period });
  const cached = monitoringCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.data, areaSource, cacheHit: true };
  }

  const data = await provider.getMonitoring({ geometry, period });
  const result = { ...data, areaSource };
  if (monitoringCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = monitoringCache.keys().next().value;
    if (oldestKey) monitoringCache.delete(oldestKey);
  }
  monitoringCache.set(cacheKey, { data: result, cachedAt: Date.now() });
  return { ...result, cacheHit: false };
};

export const satelliteGeometryForFarm = (farm, plot = null) => {
  const boundary = plot ? plot.boundary : farm?.boundary;
  if (
    boundary?.type === "Polygon"
    && Array.isArray(boundary.coordinates?.[0])
    && boundary.coordinates[0].length >= 4
  ) {
    return {
      geometry: {
        type: "Polygon",
        coordinates: boundary.coordinates.map((ring) => ring.map((point) => [...point]))
      },
      areaSource: plot ? "plot-boundary" : "farm-boundary"
    };
  }

  const point = plot || farm;
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);
  if (
    !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    throw new SatelliteProviderError("Farm coordinates or a valid boundary are required for satellite monitoring.", 400);
  }

  const latitudeOffset = 0.0005;
  const longitudeOffset = latitudeOffset / Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  return {
    geometry: {
      type: "Polygon",
      coordinates: [[
        [longitude - longitudeOffset, latitude - latitudeOffset],
        [longitude + longitudeOffset, latitude - latitudeOffset],
        [longitude + longitudeOffset, latitude + latitudeOffset],
        [longitude - longitudeOffset, latitude + latitudeOffset],
        [longitude - longitudeOffset, latitude - latitudeOffset]
      ]]
    },
    areaSource: "approximate-location-buffer"
  };
};
