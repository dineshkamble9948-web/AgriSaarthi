
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useWeather from "../hooks/useWeather";
import formatWeatherTime from "../utils/formatWeatherTime";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Sprout,
  ScanSearch,
  CloudSun,
  FlaskConical,
  History,
  Map as MapIcon,
  Calculator,
  Lightbulb,
  TrendingUp,
  ArrowLeft,
  ShieldAlert,
  CloudRain,
  Droplets,
  CheckCircle2
} from "lucide-react";

const moduleDetails = {
  "Crop Recommendation": {
    icon: Sprout,
    description: "Get crop suggestions from soil nutrients, climate, and pH using a dataset-trained Random Forest.",
    features: ["N, P, and K values", "Temperature and humidity", "Soil pH and rainfall", "Top three model predictions"]
  },
  "Disease Detection": {
    icon: ScanSearch,
    description: "Check leaf images against Pl@ntNet's disease catalog for possible matches.",
    features: ["JPEG or PNG leaf image", "Crop context", "Possible matches and confidence scores", "Diagnosis guidance"]
  },
  "Weather Intelligence": {
    icon: CloudSun,
    description: "Get live current conditions and a standard five-day forecast for your registered farm location.",
    features: ["Current conditions and solar times", "Three-hour outlook", "Five-day forecast", "Rainfall and precipitation chance"]
  },
  "Fertilizer & Soil": {
    icon: FlaskConical,
    description: "Understand your soil and receive crop-specific nutrient recommendations.",
    features: ["NPK analysis", "pH guidance", "Fertilizer recommendations", "Crop-linked advice"]
  },
  "Farm History": {
    icon: History,
    description: "Maintain a record of your farming activities across different seasons.",
    features: ["Season records", "Crop history", "Expense tracking", "Filtered insights"]
  },
  "Farm Digital Twin": {
    icon: MapIcon,
    description: "Create a digital view of your farmland and key operational metrics.",
    features: ["Farm area", "Crop status", "Soil health", "Water availability"]
  },
  "What-If Simulation": {
    icon: Calculator,
    description: "Compare farming decisions before choosing your next crop or action.",
    features: ["Scenario changes", "Profit estimate", "Water impact", "Comparison output"]
  },
  "Next Best Action": {
    icon: Lightbulb,
    description: "Receive personalized farming recommendations based on your farm conditions.",
    features: ["Priority advice", "Timing suggestions", "Risk warning", "Action planning"]
  },
  "Market Intelligence": {
    icon: TrendingUp,
    description: "Compare the latest mandi prices and review historical commodity price movement.",
    features: ["Daily mandi prices", "State, district, commodity, market and date filters", "Market comparisons", "Arrival-date price trends"]
  }
};

function CropRecommendationPanel() {
  const [form, setForm] = useState({
    N: "",
    P: "",
    K: "",
    temperature: "",
    humidity: "",
    ph: "",
    rainfall: ""
  });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getRecommendations = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const inputs = Object.fromEntries(
        Object.entries(form).map(([feature, value]) => [feature, Number(value)])
      );
      const response = await api.post("/crops/recommend", inputs);
      setRecommendations(response.data.recommendations || []);
    } catch (requestError) {
      setRecommendations([]);
      setError(
        requestError.response?.data?.message
        || "Could not reach the crop recommendation service. Check that the backend and ML service are running."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    { name: "N", label: "Nitrogen (N)", min: 0, max: 200, step: 1 },
    { name: "P", label: "Phosphorus (P)", min: 0, max: 200, step: 1 },
    { name: "K", label: "Potassium (K)", min: 0, max: 300, step: 1 },
    { name: "temperature", label: "Temperature (°C)", min: -10, max: 60, step: 0.1 },
    { name: "humidity", label: "Humidity (%)", min: 0, max: 100, step: 0.1 },
    { name: "ph", label: "Soil pH", min: 0, max: 14, step: 0.1 },
    { name: "rainfall", label: "Rainfall (mm)", min: 0, max: 5000, step: 0.1 }
  ];

  return (
    <div className="module-content-grid">
      <form className="panel" onSubmit={getRecommendations}>
        <h3>Soil and climate inputs</h3>
        <div className="module-form-grid">
          {inputFields.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                type="number"
                name={field.name}
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.name]}
                onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                required
              />
            </label>
          ))}
        </div>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Finding suitable crops..." : "Get top three crops"}
        </button>
      </form>

      <div className="panel">
        <h3>Top crop predictions</h3>
        <div className="recommendation-list">
          {error ? (
            <div className="risk-box">
              <ShieldAlert size={18} />
              <div><strong>Recommendations unavailable</strong><p>{error}</p></div>
            </div>
          ) : recommendations.length === 0 ? (
            <p>Enter the seven values from your soil test and local weather data, then request recommendations.</p>
          ) : (
            recommendations.map((crop, index) => (
              <div key={crop.crop} className="recommendation-item">
                <div className="recommendation-header">
                  <strong>{index + 1}. {crop.crop}</strong>
                  <span>{crop.score_percent}% model score</span>
                </div>
                <small>Model output score, not a probability of farming success or a yield guarantee.</small>
              </div>
            ))
          )}
        </div>
        {recommendations.length > 0 && (
          <p className="recommendation-disclaimer">
            Scores reflect the Random Forest model trained on the provided dataset. Validate recommendations with local agronomic guidance.
          </p>
        )}
      </div>
    </div>
  );
}

function DiseaseDetectionPanel() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [crop, setCrop] = useState("");
  const [catalogCount, setCatalogCount] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/disease/history")
      .then((response) => setHistory(Array.isArray(response.data.history) ? response.data.history : []))
      .catch((requestError) => console.warn("Unable to load disease history", requestError));

    api.get("/disease/catalog")
      .then((response) => setCatalogCount(response.data.count))
      .catch((requestError) => {
        setCatalogError(
          requestError.response?.data?.message
          || "The Pl@ntNet disease catalog is unavailable right now."
        );
      });
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setPreview("");
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      setFile(null);
      setPreview("");
      setError("Please upload a JPEG or PNG leaf image.");
      event.target.value = "";
      return;
    }

    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!file || !crop) {
      setError("Choose a crop and upload a JPEG or PNG leaf image.");
      return;
    }

    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("crop", crop);
    setLoading(true);

    try {
      const response = await api.post("/disease/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data);
      if (response.data.report) {
        setHistory((previous) => [
          response.data.report,
          ...previous.filter((item) => item._id !== response.data.report._id)
        ]);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        || "Unable to analyze the image right now."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const results = Array.isArray(result?.results) ? result.results : [];

  return (
    <div className="module-content-grid">
      <form className="panel disease-upload-form" onSubmit={handleAnalyze}>
        <h3>Check a crop leaf</h3>
        <div className="module-form-grid">
          <label>
            Crop
            <select value={crop} onChange={(event) => setCrop(event.target.value)} required>
              <option value="">Select a crop</option>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Maize">Maize</option>
              <option value="Tomato">Tomato</option>
              <option value="Potato">Potato</option>
              <option value="Cotton">Cotton</option>
              <option value="Chilli">Chilli</option>
              <option value="Soybean">Soybean</option>
              <option value="Other">Other / not listed</option>
            </select>
          </label>
          <label>
            Leaf image (JPEG or PNG, up to 5 MB)
            <input
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              onChange={handleFileChange}
              required
            />
          </label>
        </div>
        <p className="disease-info-note">
          Crop is saved as context only; Pl@ntNet does not use it to filter identification. Its disease catalog supports a limited set of plants and pathologies.
        </p>
        {catalogCount !== null ? (
          <p className="disease-catalog-status">
            Pl@ntNet catalog: {catalogCount} identifiable disease entries.
          </p>
        ) : catalogError ? (
          <p className="disease-inline-error">{catalogError}</p>
        ) : null}
        {preview && <img src={preview} alt="Selected leaf preview" className="upload-preview" />}
        {error && (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div>
              <strong>Could not analyze image</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
        <button className="primary-button disease-detect-button" type="submit" disabled={loading || !file || !crop}>
          {loading ? "Analyzing..." : "Detect Disease"}
        </button>
        {loading && <div className="status-pill" role="status">Sending image to Pl@ntNet...</div>}
      </form>

      <div className="panel disease-results-panel" aria-live="polite">
        <h3>Possible identifications</h3>
        {results.length ? (
          <>
            <p className="disease-result-caveat">
              These are uncertain AI matches, not confirmed diagnoses. Verify symptoms with a local agricultural expert.
            </p>
            <div className="disease-result-list">
              {results.map((match, index) => {
                const hasScore = Number.isFinite(match.score);
                const title = match.description || match.name || "Disease identification";

                return (
                  <article className="disease-result-card" key={`${match.name || title}-${index}`}>
                    <div className="disease-result-heading">
                      <span>Possible match {index + 1}</span>
                      {hasScore && <strong>{Math.round(match.score * 100)}% confidence</strong>}
                    </div>
                    <h4>{title}</h4>
                    {match.name && match.description && <p className="disease-code">EPPO code: {match.name}</p>}
                    {hasScore && (
                      <p className="disease-score-note">
                        Pl@ntNet confidence score: {match.score.toFixed(3)} (not a confirmed diagnosis).
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="disease-guidance">
              <strong>Prevention and treatment</strong>
              <p>
                Pl@ntNet does not provide disease-specific guidance. As general precautions, clean tools after handling affected plants and avoid moving symptomatic plant debris between plots. Confirm the diagnosis with a local agricultural expert before applying any treatment.
              </p>
            </div>
          </>
        ) : result ? (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div>
              <strong>No disease match returned</strong>
              <p>{result.message} The crop or pathology may not be in Pl@ntNet's supported catalog. Try a clear leaf image or seek local expert advice.</p>
            </div>
          </div>
        ) : (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div>
              <strong>Ready to check</strong>
              <p>Upload a leaf image and select its crop to view possible disease matches.</p>
            </div>
          </div>
        )}
      </div>

      <div className="panel disease-history-panel">
        <h3>Recent disease history</h3>
        {history.length === 0 ? (
          <p>No previous disease checks yet.</p>
        ) : (
          <ul className="module-bullets">
            {history.slice(0, 4).map((item) => {
              const firstMatch = item.results?.[0];
              const label = firstMatch?.description
                || firstMatch?.name
                || item.prediction?.prediction
                || "No match";
              const score = Number.isFinite(firstMatch?.score)
                ? `${Math.round(firstMatch.score * 100)}% confidence`
                : null;

              return (
                <li key={item._id || item.id}>
                  <strong>{label}</strong> — {item.crop || item.prediction?.crop || "Crop not recorded"}
                  {score && ` • ${score}`} • {new Date(item.createdAt).toLocaleDateString()}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function WeatherPanel({ farm }) {
  const { weather, loading, error, retry } = useWeather(farm?.location, farm?.state);
  const location = weather?.location;
  const current = weather?.current;
  const timezoneOffsetSeconds = location?.timezoneOffsetSeconds || 0;
  const hasFarmLocation = Boolean(farm?.location?.trim());
  const formatTime = (date) => formatWeatherTime(date, timezoneOffsetSeconds, {
    hour: "2-digit",
    minute: "2-digit"
  });
  const formatDay = (date) => formatWeatherTime(date, timezoneOffsetSeconds, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="module-content-grid">
      <div className="panel weather-preview">
        <div className="panel-header">
          <div>
            <h3>Current conditions</h3>
            <p>{location ? [location.name, location.region, location.country].filter(Boolean).join(", ") : farm?.location || "Farm location not set"}</p>
          </div>
          <CloudSun size={22} color="#26945d" />
        </div>

        {!hasFarmLocation ? (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div><strong>Farm location required</strong><p>Add a location to the farm profile to get local weather.</p></div>
          </div>
        ) : loading && !weather ? (
          <div className="status-pill">Loading live weather...</div>
        ) : error && !weather ? (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div className="weather-error-content">
              <strong>Weather unavailable</strong>
              <p>{error}</p>
              <button type="button" className="secondary-button" onClick={retry}>Retry</button>
            </div>
          </div>
        ) : current ? (
          <>
            <div className="weather-main">
              <CloudRain size={48} color="#4d9ccc" />
              <div>
                <h1>{current.temperatureC == null ? "—" : Math.round(current.temperatureC)}°C</h1>
                <span>{current.condition.description}</span>
              </div>
            </div>

            <div className="weather-details">
              <div><Droplets size={18} /><span>Humidity</span><strong>{current.humidityPercent ?? "—"}%</strong></div>
              <div><CloudRain size={18} /><span>Rain (last hour)</span><strong>{current.rainfallLastHourMm ?? "—"} mm</strong></div>
              <div><CheckCircle2 size={18} /><span>Feels like</span><strong>{current.feelsLikeC == null ? "—" : Math.round(current.feelsLikeC)}°C</strong></div>
              <div><CloudRain size={18} /><span>Wind</span><strong>{current.windSpeedKph ?? "—"} km/h</strong></div>
              <div><CloudRain size={18} /><span>Wind direction</span><strong>{current.windDirectionDegrees ?? "—"}°</strong></div>
              <div><CheckCircle2 size={18} /><span>Sunrise / sunset</span><strong>{formatTime(current.sunriseAt)} / {formatTime(current.sunsetAt)}</strong></div>
            </div>
          </>
        ) : (
          <p>Current conditions are unavailable from the weather provider.</p>
        )}
        {weather && (
          <div className="weather-source-note">
            Source: {weather.source} • Updated {formatTime(weather.fetchedAt)} local time{weather.cacheHit ? " • cached" : ""}
          </div>
        )}
        {error && weather && (
          <div className="weather-inline-error">
            <span>Refresh failed: {error}</span>
            <button type="button" className="text-button" onClick={retry}>Retry</button>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>5-day forecast</h3>
        {weather?.daily?.length ? (
          <ul className="module-bullets">
            {weather.daily.map((day) => (
              <li key={day.date}>
                <strong>{formatDay(day.date)}:</strong> {day.condition.description} • {day.temperatureMaxC == null ? "—" : Math.round(day.temperatureMaxC)}°C / {day.temperatureMinC == null ? "—" : Math.round(day.temperatureMinC)}°C • {day.precipitationProbabilityPercent ?? "—"}% precipitation chance • {day.rainfallMm ?? "—"} mm rain
              </li>
            ))}
          </ul>
        ) : (
          <p>{loading ? "Loading forecast..." : "No forecast data available."}</p>
        )}
      </div>

      <div className="panel">
        <h3>3-hour outlook</h3>
        {weather?.hourly?.length ? (
          <ul className="module-bullets">
            {weather.hourly.slice(0, 8).map((hour) => (
              <li key={hour.time}>
                <strong>{formatTime(hour.time)}:</strong> {hour.temperatureC == null ? "—" : Math.round(hour.temperatureC)}°C • {hour.condition.description} • {hour.precipitationProbabilityPercent ?? "—"}% precipitation chance
              </li>
            ))}
          </ul>
        ) : (
          <p>{loading ? "Loading hourly outlook..." : "No hourly data available."}</p>
        )}
      </div>

      <div className="panel">
        <h3>Weather alerts</h3>
        <p>Weather alerts are not included with OpenWeather's standard current and five-day forecast APIs.</p>
      </div>
    </div>
  );
}

function SoilPanel() {
  return (
    <div className="module-content-grid">
      <div className="panel">
        <h3>Soil profile</h3>
        <ul className="module-bullets">
          <li><strong>Soil pH:</strong> 6.4</li>
          <li><strong>Nitrogen:</strong> 58 kg/ha</li>
          <li><strong>Phosphorus:</strong> 32 kg/ha</li>
          <li><strong>Potassium:</strong> 40 kg/ha</li>
        </ul>
      </div>

      <div className="panel">
        <h3>Fertilizer guidance</h3>
        <p>For this nutrient profile, a balanced nitrogen boost and moderate phosphorus support are appropriate for maize or paddy. Avoid over-applying potassium unless the crop stage suggests it.</p>
      </div>
    </div>
  );
}

function DigitalTwinPanel() {
  return (
    <div className="stats-grid">
      <div className="panel stat-card"><h3>Farm area</h3><p className="stat-big">6.5 acres</p></div>
      <div className="panel stat-card"><h3>Crop status</h3><p className="stat-big">3 active</p></div>
      <div className="panel stat-card"><h3>Soil health</h3><p className="stat-big">Healthy</p></div>
      <div className="panel stat-card"><h3>Irrigation</h3><p className="stat-big">Drip system</p></div>
    </div>
  );
}

function WhatIfPanel() {
  const [scenario, setScenario] = useState({ crop: "Rice", fertilizer: 70, water: 80, cost: 25000 });
  const estimatedValue = Math.round((scenario.crop === "Rice" ? 3.2 : 2.8) * (scenario.water / 100) * 10000 + scenario.fertilizer * 25 - scenario.cost / 3);

  return (
    <div className="panel">
      <h3>What-if simulation</h3>
      <div className="module-form-grid">
        <label>Crop<select value={scenario.crop} onChange={(e) => setScenario({ ...scenario, crop: e.target.value })}><option>Rice</option><option>Maize</option><option>Groundnut</option></select></label>
        <label>Fertilizer (kg)<input type="number" value={scenario.fertilizer} onChange={(e) => setScenario({ ...scenario, fertilizer: Number(e.target.value) })} /></label>
        <label>Water (%)<input type="number" value={scenario.water} onChange={(e) => setScenario({ ...scenario, water: Number(e.target.value) })} /></label>
        <label>Cost (₹)<input type="number" value={scenario.cost} onChange={(e) => setScenario({ ...scenario, cost: Number(e.target.value) })} /></label>
      </div>
      <div className="risk-box"><strong>Estimated outcome:</strong> ₹{estimatedValue.toLocaleString()} net estimate based on transparent assumptions.</div>
    </div>
  );
}

function NextBestActionPanel() {
  const actions = [
    { priority: "High", reason: "Humidity is high; reduce drip timing by 15 minutes.", timing: "Today" },
    { priority: "Medium", reason: "Review soil nutrition before next fertilizer application.", timing: "This week" },
    { priority: "Low", reason: "Monitor pest activity after afternoon rain exposure.", timing: "3 days" }
  ];

  return (
    <div className="panel">
      <h3>Priority actions</h3>
      {actions.map((action) => (
        <div key={action.priority} className="recommendation-item">
          <div className="recommendation-header"><strong>{action.priority}</strong><span>{action.timing}</span></div>
          <p>{action.reason}</p>
        </div>
      ))}
    </div>
  );
}

const MARKET_PAGE_SIZE = 20;
const EMPTY_MARKET_FILTERS = {
  state: "",
  district: "",
  commodity: "",
  market: "",
  date: ""
};

const dateForChart = (value) => {
  const dateValue = typeof value === "string" ? value : "";
  const mandiDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue);
  const isoDate = mandiDate
    ? `${mandiDate[3]}-${mandiDate[2]}-${mandiDate[1]}`
    : dateValue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return "";

  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoDate
    ? ""
    : isoDate;
};

const displayMandiDate = (value) => {
  const isoDate = dateForChart(value);
  if (!isoDate) return typeof value === "string" && value ? value : "—";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const formatMandiPrice = (value) => {
  const price = typeof value === "number" ? value : Number(value);
  return value === null || value === undefined || !Number.isFinite(price)
    ? "—"
    : `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const marketText = (value) => (
  value === undefined || value === null ? "" : String(value)
);

const marketNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeMarketRecord = (record) => ({
  state: marketText(record.state),
  district: marketText(record.district),
  market: marketText(record.market),
  commodity: marketText(record.commodity),
  variety: marketText(record.variety),
  arrivalDate: marketText(record.arrivalDate),
  minPrice: marketNumber(record.minPrice),
  maxPrice: marketNumber(record.maxPrice),
  modalPrice: marketNumber(record.modalPrice),
  dataPoints: marketNumber(record.dataPoints)
});

const marketErrorMessage = (requestError, fallback) => {
  const message = requestError?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (requestError instanceof Error && requestError.message) return requestError.message;
  return fallback;
};

function MarketPanel() {
  const [draftFilters, setDraftFilters] = useState(EMPTY_MARKET_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_MARKET_FILTERS);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const [cacheWarning, setCacheWarning] = useState("");
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyWarning, setHistoryWarning] = useState("");

  const loadPrices = useCallback(async (filters) => {
    setLoading(true);
    setError("");
    setCacheWarning("");

    try {
      const response = await api.get("/market/prices", {
        params: filters
      });
      const payload = response?.data;
      if (!payload || !Array.isArray(payload.records)) {
        throw new Error("Market prices were returned in an invalid format. Please retry.");
      }

      const safeRecords = payload.records
        .filter((record) => record && typeof record === "object" && !Array.isArray(record))
        .map(normalizeMarketRecord);
      setRecords(safeRecords);
      const reportedTotal = Number(payload.total);
      setTotal(Number.isSafeInteger(reportedTotal) && reportedTotal >= 0
        ? reportedTotal
        : safeRecords.length);
      setFetchedAt(typeof payload.fetchedAt === "string" ? payload.fetchedAt : "");
      setCacheWarning(typeof payload.cacheWarning === "string" ? payload.cacheWarning : "");
      setOffset(0);
      return true;
    } catch (requestError) {
      setRecords([]);
      setTotal(0);
      setFetchedAt("");
      setError(marketErrorMessage(
        requestError,
        "Could not load mandi prices. Check the backend connection and try again."
      ));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get("/market/options", {
      params: draftFilters.state ? { state: draftFilters.state } : {}
    })
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data;
        if (!payload || typeof payload !== "object") {
          throw new Error("Market filter options were returned in an invalid format.");
        }
        setOptionsError(typeof payload.optionsWarning === "string" ? payload.optionsWarning : "");

        if (draftFilters.state) {
          if (!Array.isArray(payload.districts) || !Array.isArray(payload.markets)) {
            throw new Error("District and mandi filters were returned in an invalid format.");
          }
          setDistricts(payload.districts.filter((district) => typeof district === "string"));
          setMarkets(payload.markets
            .filter((market) => market && typeof market.market === "string")
            .map((market) => ({
              market: market.market,
              district: typeof market.district === "string" ? market.district : ""
            })));
        } else {
          if (!Array.isArray(payload.states)) {
            throw new Error("State filters were returned in an invalid format.");
          }
          setStates(payload.states.filter((state) => typeof state === "string"));
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        setOptionsError(marketErrorMessage(requestError, "Could not load state and mandi filters."));
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draftFilters.state]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!activeFilters.state || !activeFilters.commodity) {
        setHistoryRecords([]);
        setHistoryError("");
        setHistoryWarning("");
        setHistoryLoading(false);
        return;
      }
      if (activeFilters.district && !activeFilters.market) {
        setHistoryRecords([]);
        setHistoryError("Select a mandi to view a district-specific price trend.");
        setHistoryWarning("");
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      setHistoryError("");
      setHistoryWarning("");
      try {
        const response = await api.get("/market/prices/history", {
          params: {
            state: activeFilters.state,
            commodity: activeFilters.commodity,
            district: activeFilters.district,
            market: activeFilters.market
          }
        });
        const payload = response?.data;
        if (!payload || !Array.isArray(payload.records)) {
          throw new Error("Historical prices were returned in an invalid format.");
        }

        if (!cancelled) {
          setHistoryRecords(payload.records
            .filter((record) => record && typeof record === "object" && !Array.isArray(record))
            .map(normalizeMarketRecord));
          setHistoryWarning(typeof payload.cacheWarning === "string" ? payload.cacheWarning : "");
        }
      } catch (requestError) {
        if (!cancelled) {
          setHistoryRecords([]);
          setHistoryWarning("");
          setHistoryError(marketErrorMessage(
            requestError,
            "Historical price trends are temporarily unavailable."
          ));
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [activeFilters]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    if (name === "state" && value !== draftFilters.state) {
      setOptionsLoading(true);
      setOptionsError("");
      setDistricts([]);
      setMarkets([]);
    }
    setDraftFilters((current) => (
      name === "state"
        ? { ...current, state: value, district: "", market: "" }
        : name === "district"
          ? { ...current, district: value, market: "" }
          : { ...current, [name]: value }
    ));
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    const nextFilters = Object.fromEntries(
      Object.entries(draftFilters)
        .map(([name, value]) => [name, value.trim()])
        .filter(([, value]) => value)
    );
    if (!nextFilters.state && !nextFilters.commodity) {
      setActiveFilters(nextFilters);
      setRecords([]);
      setTotal(0);
      setFetchedAt("");
      setHistoryRecords([]);
      setHistoryError("");
      setHistoryWarning("");
      setError("Enter a crop or select a state before searching.");
      return;
    }

    setActiveFilters(nextFilters);
    setOffset(0);
    setRecords([]);
    setTotal(0);
    await loadPrices(nextFilters);
  };

  const clearFilters = () => {
    if (draftFilters.state) setOptionsLoading(true);
    setOptionsError("");
    setDraftFilters(EMPTY_MARKET_FILTERS);
    setActiveFilters(EMPTY_MARKET_FILTERS);
    setOffset(0);
    setRecords([]);
    setTotal(0);
    setFetchedAt("");
    setError("");
    setCacheWarning("");
    setHistoryRecords([]);
    setHistoryError("");
    setHistoryWarning("");
  };

  const changePage = (nextOffset) => {
    if (nextOffset < 0 || nextOffset >= total) return;
    setOffset(nextOffset);
  };

  const visibleRecords = records.slice(offset, offset + MARKET_PAGE_SIZE);
  const filteredMarkets = markets.filter((market) => (
    !draftFilters.district || market.district === draftFilters.district
  ));
  const rankedMarkets = useMemo(() => {
    if (!activeFilters.commodity) return [];

    const latestByMarket = new Map();
    const newestFirst = records
      .filter((record) => Number.isFinite(record.modalPrice))
      .sort((left, right) => (
        dateForChart(right.arrivalDate).localeCompare(dateForChart(left.arrivalDate))
      ));

    newestFirst.forEach((record) => {
      const key = [
        record.state,
        record.district,
        record.market,
        record.commodity
      ].join("|").toLocaleLowerCase();
      if (!latestByMarket.has(key)) latestByMarket.set(key, record);
    });

    return Array.from(latestByMarket.values())
      .sort((left, right) => right.modalPrice - left.modalPrice);
  }, [activeFilters.commodity, records]);
  const bestMarket = rankedMarkets[0];
  const lowestMarket = rankedMarkets[rankedMarkets.length - 1];
  const averageModalPrice = rankedMarkets.length
    ? rankedMarkets.reduce((totalPrice, record) => totalPrice + record.modalPrice, 0) / rankedMarkets.length
    : null;
  const marketComparisonData = rankedMarkets.slice(0, 10).map((record) => ({
    name: record.market || "Market",
    location: [record.district, record.state].filter(Boolean).join(", "),
    arrivalDate: record.arrivalDate,
    minPrice: record.minPrice,
    modalPrice: record.modalPrice,
    maxPrice: record.maxPrice
  }));
  const trendData = useMemo(() => {
    const byDate = new Map();
    historyRecords.forEach((record) => {
      const date = dateForChart(record.arrivalDate);
      if (!date || !Number.isFinite(record.modalPrice)) return;

      const point = byDate.get(date) || { date, total: 0, count: 0 };
      point.total += record.modalPrice;
      point.count += 1;
      byDate.set(date, point);
    });

    return Array.from(byDate.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((point) => ({
        date: point.date,
        modalPrice: Math.round((point.total / point.count) * 100) / 100
      }));
  }, [historyRecords]);
  const trendChange = trendData.length > 1
    ? trendData[trendData.length - 1].modalPrice - trendData[0].modalPrice
    : null;
  const trendPercent = trendData.length > 1 && trendData[0].modalPrice !== 0
    ? (trendChange / trendData[0].modalPrice) * 100
    : null;
  const firstResult = total ? offset + 1 : 0;
  const lastResult = Math.min(offset + visibleRecords.length, total);

  return (
    <div className="market-dashboard">
      <form className="panel market-filter-panel" onSubmit={applyFilters}>
        <div className="market-panel-heading">
          <div>
            <h3>Search mandi prices</h3>
            <p>Search recent mandi prices from the Mandi Price API.</p>
          </div>
          <span className="market-source-badge">Mandi Price API</span>
        </div>
        <div className="market-filter-grid">
          <label>
            State
            <select name="state" value={draftFilters.state} onChange={updateFilter}>
              <option value="">All supported states</option>
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <label>
            District
            <select
              name="district"
              value={draftFilters.district}
              onChange={updateFilter}
              disabled={!draftFilters.state || optionsLoading}
            >
              <option value="">All districts</option>
              {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label>
            Crop / commodity
            <input
              name="commodity"
              list="market-commodity-suggestions"
              value={draftFilters.commodity}
              onChange={updateFilter}
              placeholder="e.g. Rice, Tomato, Onion"
            />
            <datalist id="market-commodity-suggestions">
              {["Rice", "Wheat", "Tomato", "Onion", "Cotton", "Maize"].map((commodity) => (
                <option key={commodity} value={commodity} />
              ))}
            </datalist>
          </label>
          <label>
            Mandi
            <select
              name="market"
              value={draftFilters.market}
              onChange={updateFilter}
              disabled={!draftFilters.state || optionsLoading}
            >
              <option value="">All mandis</option>
              {filteredMarkets.map((market) => (
                <option key={`${market.market}-${market.district}`} value={market.market}>
                  {market.market}
                </option>
              ))}
            </select>
          </label>
          <label>Arrival date<input name="date" type="date" value={draftFilters.date} onChange={updateFilter} /></label>
        </div>
        {optionsError && <p className="market-empty-note" role="status">{optionsError}</p>}
        <div className="market-filter-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Loading prices..." : "Search prices"}
          </button>
          <button className="secondary-button" type="button" onClick={clearFilters} disabled={loading}>
            Clear filters
          </button>
        </div>
      </form>

      {cacheWarning && <p className="market-empty-note" role="status">{cacheWarning}</p>}

      {error && (
        <div className="risk-box market-error" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>Market data unavailable</strong>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={() => loadPrices(activeFilters)} disabled={loading}>
              Retry
            </button>
          </div>
        </div>
      )}

      {bestMarket && (
        <section className="market-summary-grid" aria-label="Market summary">
          <div className="panel market-summary-card">
            <span>Lowest modal price</span>
            <strong>{formatMandiPrice(lowestMarket.modalPrice)} / quintal</strong>
            <p>
              {lowestMarket.market}, {lowestMarket.state}
              {lowestMarket.arrivalDate ? ` · ${displayMandiDate(lowestMarket.arrivalDate)}` : ""}
            </p>
          </div>
          <div className="panel market-summary-card">
            <span>Average modal price</span>
            <strong>{formatMandiPrice(averageModalPrice)} / quintal</strong>
            <p>Across {rankedMarkets.length.toLocaleString("en-IN")} matching mandis</p>
          </div>
          <div className="panel market-summary-card">
            <span>Highest modal price</span>
            <strong>{formatMandiPrice(bestMarket.modalPrice)} / quintal</strong>
            <p>
              {bestMarket.market}, {bestMarket.state}
              {bestMarket.arrivalDate ? ` · ${displayMandiDate(bestMarket.arrivalDate)}` : ""}
            </p>
          </div>
          {trendData.length > 1 && (
            <div className="panel market-summary-card">
              <span>Historical movement</span>
              <strong className={trendChange > 0 ? "market-up" : trendChange < 0 ? "market-down" : ""}>
                {trendChange > 0 ? "+" : ""}{formatMandiPrice(trendChange)}
                {trendPercent !== null && ` (${trendPercent > 0 ? "+" : ""}${trendPercent.toFixed(1)}%)`}
              </strong>
              <p>{displayMandiDate(trendData[0].date)} to {displayMandiDate(trendData[trendData.length - 1].date)} · {activeFilters.commodity}</p>
            </div>
          )}
        </section>
      )}

      <section className="panel market-comparison-panel">
        <div className="market-panel-heading">
          <div>
            <h3>Price comparison by mandi</h3>
            <p>Top 10 matching mandis by modal price. Hover over a bar for its price and reporting date.</p>
          </div>
          <span className="market-source-badge">₹ / quintal</span>
        </div>
        {marketComparisonData.length ? (
          <div className="market-comparison-chart">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={marketComparisonData}
                margin={{ top: 16, right: 20, bottom: 56, left: 16 }}
              >
                <CartesianGrid stroke="#e8eee8" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={76}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  width={88}
                  tickFormatter={(value) => formatMandiPrice(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(label) => {
                    const record = marketComparisonData.find((item) => item.name === label);
                    return record
                      ? [record.name, record.location, displayMandiDate(record.arrivalDate)]
                        .filter(Boolean)
                        .join(" · ")
                      : label;
                  }}
                  formatter={(value, name) => [
                    `${formatMandiPrice(Number(value))} / quintal`,
                    name
                  ]}
                />
                <Legend verticalAlign="top" height={34} />
                <Bar dataKey="minPrice" name="Minimum" fill="#9bcf9f" radius={[3, 3, 0, 0]} />
                <Bar dataKey="modalPrice" name="Modal" fill="#27864b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="maxPrice" name="Maximum" fill="#76a9d8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="market-empty-note">
            Search for a crop or select a state to compare minimum, modal, and maximum prices across mandis.
          </p>
        )}
      </section>

      <div className="market-insights-grid">
        <section className="panel">
          <div className="market-panel-heading">
            <div>
              <h3>Compare markets</h3>
              <p>Highest modal prices in the matching mandi results.</p>
            </div>
          </div>
          {rankedMarkets.length ? (
            <ol className="market-ranking-list">
              {rankedMarkets.slice(0, 5).map((record, index) => (
                <li key={`${record.state}-${record.market}-${record.commodity}-${record.arrivalDate}-${index}`}>
                  <span className="market-rank">{index + 1}</span>
                  <div>
                    <strong>{record.market || "Market not reported"}</strong>
                    <small>{[record.district, record.state].filter(Boolean).join(", ")} · {record.commodity}</small>
                  </div>
                  <b>{formatMandiPrice(record.modalPrice)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="market-empty-note">Filter by a commodity to compare like-for-like prices across markets.</p>
          )}
        </section>

        <section className="panel market-trend-panel">
          <div className="market-panel-heading">
            <div>
              <h3>Commodity price trend</h3>
              <p>Historical modal prices reported by the Mandi Price API.</p>
            </div>
          </div>
          {historyLoading ? (
            <div className="status-pill" role="status">Loading historical prices...</div>
          ) : historyError ? (
            <p className="market-empty-note" role="status">{historyError}</p>
          ) : !activeFilters.commodity || !activeFilters.state ? (
            <p className="market-empty-note">Choose a state and crop to view historical price trends.</p>
          ) : trendData.length > 1 ? (
            <div className="market-chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="#e8eee8" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={displayMandiDate} tick={{ fontSize: 10 }} />
                  <YAxis width={72} tickFormatter={(value) => formatMandiPrice(value)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={displayMandiDate}
                    formatter={(value) => [`${formatMandiPrice(Number(value))} / quintal`, "Average modal price"]}
                  />
                  <Line type="monotone" dataKey="modalPrice" name="Average modal price" stroke="#27864b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="market-empty-note">
              No historical price trend is available for this search yet.
            </p>
          )}
          {historyWarning && <p className="market-empty-note" role="status">{historyWarning}</p>}
        </section>
      </div>

      <section className="panel market-table-panel">
        <div className="market-panel-heading">
          <div>
            <h3>Current mandi prices</h3>
            <p>
              {total.toLocaleString("en-IN")} matching records
              {fetchedAt && Number.isFinite(new Date(fetchedAt).getTime())
                ? ` · Data updated ${new Date(fetchedAt).toLocaleString()}`
                : ""}
              {loading ? " · Refreshing..." : ""}
            </p>
          </div>
          <span className="market-source-badge">Prices in ₹ / quintal</span>
        </div>

        {loading && records.length === 0 ? (
          <div className="status-pill" role="status">Loading current mandi prices...</div>
        ) : visibleRecords.length ? (
          <>
            <div className="market-table-scroll">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>State</th>
                    <th>District</th>
                    <th>Market</th>
                    <th>Minimum</th>
                    <th>Maximum</th>
                    <th>Modal</th>
                    <th>Arrival date</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record, index) => (
                    <tr key={`${record.state}-${record.market}-${record.commodity}-${record.arrivalDate}-${offset + index}`}>
                      <td><strong>{record.commodity || "—"}</strong>{record.variety && <small>{record.variety}</small>}</td>
                      <td>{record.state || "—"}</td>
                      <td>{record.district || "—"}</td>
                      <td>{record.market || "—"}</td>
                      <td>{formatMandiPrice(record.minPrice)}</td>
                      <td>{formatMandiPrice(record.maxPrice)}</td>
                      <td className="market-modal-price">{formatMandiPrice(record.modalPrice)}</td>
                      <td>{displayMandiDate(record.arrivalDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="market-pagination">
              <span>{firstResult}–{lastResult} of {total.toLocaleString("en-IN")}</span>
              <div>
                <button className="secondary-button" type="button" onClick={() => changePage(offset - MARKET_PAGE_SIZE)} disabled={loading || offset === 0}>
                  Previous
                </button>
                <button className="secondary-button" type="button" onClick={() => changePage(offset + MARKET_PAGE_SIZE)} disabled={loading || offset + MARKET_PAGE_SIZE >= total}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : !error && !loading ? (
        <p className="market-empty-note">
          {activeFilters.state || activeFilters.commodity
            ? "No mandi records matched these filters. Try broadening your search."
            : "Select a state or enter a crop to search mandi prices."}
        </p>
        ) : null}
        <p className="market-disclaimer">
          Source: Mandi Price API, with data sourced from the Government of India. Prices are reported observations, not guaranteed sale prices or forecasts.
        </p>
      </section>
    </div>
  );
}

class MarketPanelErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel market-error" role="alert">
          <strong>Market Intelligence could not display these results.</strong>
          <p>Some market data was in an unexpected format. Retry the search or clear the filters.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const moduleContentMap = {
  "Crop Recommendation": CropRecommendationPanel,
  "Disease Detection": DiseaseDetectionPanel,
  "Weather Intelligence": WeatherPanel,
  "Fertilizer & Soil": SoilPanel,
  "Farm Digital Twin": DigitalTwinPanel,
  "What-If Simulation": WhatIfPanel,
  "Next Best Action": NextBestActionPanel,
  "Market Intelligence": MarketPanel
};

export default function ModulePage({ page, setActivePage, farm }) {
  const module = moduleDetails[page];

  if (!module) {
    return <div className="dashboard">Page not found.</div>;
  }

  const Icon = module.icon;
  const Content = moduleContentMap[page] || null;

  return (
    <div className="dashboard module-page">
      <button className="back-button" onClick={() => setActivePage("Dashboard")}>
        <ArrowLeft size={17} />
        Back to Dashboard
      </button>

      <div className="module-hero panel">
        <div className="module-hero-icon"><Icon size={34} /></div>
        <span className="welcome-label">AGRISAARTHI MODULE</span>
        <h1>{page}</h1>
        <p>{module.description}</p>
      </div>

      <div className="panel module-feature-panel">
        <h3>Operational capabilities</h3>
        <div className="module-feature-list">
          {module.features.map((feature, index) => (
            <div className="module-feature" key={feature}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{feature}</strong>
            </div>
          ))}
        </div>
      </div>

      {Content ? (
        page === "Market Intelligence" ? (
          <MarketPanelErrorBoundary key={page}>
            <Content farm={farm} />
          </MarketPanelErrorBoundary>
        ) : (
          <Content farm={farm} />
        )
      ) : null}
    </div>
  );
}
