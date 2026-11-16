
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useWeather from "../hooks/useWeather";
import formatWeatherTime from "../utils/formatWeatherTime";
import SoilIntelligence from "./SoilIntelligence";
import DigitalTwinDashboard from "./DigitalTwinDashboard";
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
    description: "Monitor mapped farms and plots alongside real weather, soil, crop, satellite, and irrigation data.",
    features: ["GPS location and farm boundaries", "Weather and soil history", "Crop lifecycle monitoring", "Sentinel-2 vegetation and irrigation guidance"]
  },
  "What-If Simulation": {
    icon: Calculator,
    description: "Compare estimated crop returns using mandi prices and editable farm assumptions.",
    features: ["Crop-by-crop mandi prices", "Yield and cost assumptions", "Water and disease-risk comparison", "Revenue and profit estimates"]
  },
  "Next Best Action": {
    icon: Lightbulb,
    description: "Get a prioritized action plan based on farm details, weather, farm history and mandi trends.",
    features: ["Weather-informed irrigation review", "Crop inspection reminders", "Recent crop price movement", "Farm profile and activity follow-up"]
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
  const [isOffline, setIsOffline] = useState(false);
  const [cachedTimestamp, setCachedTimestamp] = useState(null);

  const getRecommendations = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const inputs = Object.fromEntries(
        Object.entries(form).map(([feature, value]) => [feature, Number(value)])
      );
      const response = await api.post("/crops/recommend", inputs);
      const recs = response.data.recommendations || [];
      setRecommendations(recs);
      setIsOffline(false);
      try {
        localStorage.setItem(
          "agrisaarthi_cached_crop_rec",
          JSON.stringify({ recommendations: recs, timestamp: new Date().toISOString() })
        );
      } catch (e) {
        // ignore storage errors
      }
    } catch (requestError) {
      // NFR12 & Acceptance Criteria: Offline fallback to cached recommendation
      const cached = localStorage.getItem("agrisaarthi_cached_crop_rec");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRecommendations(parsed.recommendations || []);
          setIsOffline(true);
          setCachedTimestamp(parsed.timestamp);
          setError("");
        } catch (e) {
          setRecommendations([]);
          setError(
            requestError.response?.data?.message
            || "Could not reach the crop recommendation service. Check that the backend and ML service are running."
          );
        }
      } else {
        setRecommendations([]);
        setError(
          requestError.response?.data?.message
          || "Could not reach the crop recommendation service. Check that the backend and ML service are running."
        );
      }
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
        {isOffline && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
            <strong>⚡ Offline Mode (NFR12 / Acceptance Criteria)</strong>
            <p style={{ margin: "4px 0 0" }}>Displaying last saved recommendations cached on your device{cachedTimestamp ? ` (${new Date(cachedTimestamp).toLocaleDateString()})` : ""}. Live ML service is currently offline.</p>
          </div>
        )}
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
  return <SoilIntelligence />;
}

function DigitalTwinPanel({ farm, setActivePage, onFarmUpdated }) {
  return (
    <div className="digital-twin-module">
      <DigitalTwinDashboard
        farm={farm}
        setActivePage={setActivePage}
        onFarmUpdated={onFarmUpdated}
      />
    </div>
  );
}

const WHAT_IF_CROPS = ["Rice", "Wheat", "Tomato", "Onion", "Cotton", "Maize", "Groundnut"];
const WHAT_IF_STATES = ["Maharashtra", "Uttar Pradesh", "Punjab", "Madhya Pradesh", "Karnataka"];
const INITIAL_CROP_SCENARIOS = [
  {
    crop: "Tomato",
    yieldTonsPerAcre: 8.2,
    costPerAcre: 62000,
    waterNeed: "High",
    diseaseRisk: "Medium",
    priceOverride: ""
  },
  {
    crop: "Groundnut",
    yieldTonsPerAcre: 2.1,
    costPerAcre: 38000,
    waterNeed: "Medium",
    diseaseRisk: "Low",
    priceOverride: ""
  }
];

const averageModalPrice = (records) => {
  if (!Array.isArray(records)) return null;
  const prices = records
    .map((record) => record?.modalPrice)
    .filter((price) => typeof price === "number" && Number.isFinite(price) && price > 0);
  if (!prices.length) return null;
  return Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100;
};

const formatScenarioCurrency = (value) => {
  if (!Number.isFinite(value)) return "—";
  const formatted = Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return value < 0 ? `−₹${formatted}` : `₹${formatted}`;
};

function WhatIfPanel({ farm }) {
  const initialAreaAcres = Number(farm?.area) > 0
    ? Number(farm.area) * (farm.areaUnit === "hectares" ? 2.47105 : 1)
    : 1;
  const [areaAcres, setAreaAcres] = useState(initialAreaAcres);
  const [marketState, setMarketState] = useState(
    WHAT_IF_STATES.includes(farm?.state) ? farm.state : "Karnataka"
  );
  const [scenarios, setScenarios] = useState(INITIAL_CROP_SCENARIOS);
  const [priceSnapshot, setPriceSnapshot] = useState({ key: "", byCrop: {} });
  const scenarioKey = `${marketState}|${scenarios.map((scenario) => scenario.crop).join("|")}`;
  const marketPrices = priceSnapshot.key === scenarioKey ? priceSnapshot.byCrop : {};
  const pricesLoading = priceSnapshot.key !== scenarioKey;

  useEffect(() => {
    let active = true;
    const [requestedState, ...requestedCrops] = scenarioKey.split("|");
    const crops = Array.from(new Set(requestedCrops));

    Promise.all(crops.map(async (crop) => {
      try {
        const response = await api.get("/market/prices", {
          params: { state: requestedState, commodity: crop }
        });
        const records = Array.isArray(response?.data?.records) ? response.data.records : [];
        const price = averageModalPrice(records);
        return [crop, {
          price,
          count: records.filter((record) => (
            typeof record?.modalPrice === "number"
            && Number.isFinite(record.modalPrice)
            && record.modalPrice > 0
          )).length,
          fetchedAt: typeof response?.data?.fetchedAt === "string" ? response.data.fetchedAt : "",
          error: price === null ? `No reported modal price was found for ${crop} in ${requestedState}.` : ""
        }];
      } catch (requestError) {
        return [crop, {
          price: null,
          count: 0,
          fetchedAt: "",
          error: requestError.response?.data?.message
            || `Could not load a mandi price for ${crop}. Enter a price override to compare it.`
        }];
      }
    })).then((entries) => {
      if (active) setPriceSnapshot({ key: scenarioKey, byCrop: Object.fromEntries(entries) });
    });

    return () => {
      active = false;
    };
  }, [scenarioKey]);

  const updateScenario = (index, name, value) => {
    setScenarios((current) => current.map((scenario, scenarioIndex) => (
      scenarioIndex === index ? { ...scenario, [name]: value } : scenario
    )));
  };

  const results = scenarios.map((scenario) => {
    const manualPrice = scenario.priceOverride.trim() ? Number(scenario.priceOverride) : null;
    const marketPrice = marketPrices[scenario.crop]?.price;
    const pricePerQuintal = Number.isFinite(manualPrice) && manualPrice > 0
      ? manualPrice
      : marketPrice;
    const area = Number(areaAcres);
    const yieldTonsPerAcre = Number(scenario.yieldTonsPerAcre);
    const costPerAcre = Number(scenario.costPerAcre);
    const canEstimate = Number.isFinite(area)
      && area > 0
      && Number.isFinite(yieldTonsPerAcre)
      && yieldTonsPerAcre >= 0
      && Number.isFinite(costPerAcre)
      && costPerAcre >= 0
      && Number.isFinite(pricePerQuintal)
      && pricePerQuintal > 0;
    const totalYieldTons = yieldTonsPerAcre * area;
    const estimatedRevenue = canEstimate ? totalYieldTons * 10 * pricePerQuintal : null;
    const estimatedCost = canEstimate ? costPerAcre * area : null;

    return {
      ...scenario,
      pricePerQuintal,
      usesManualPrice: Number.isFinite(manualPrice) && manualPrice > 0,
      totalYieldTons,
      estimatedRevenue,
      estimatedCost,
      estimatedProfit: canEstimate ? estimatedRevenue - estimatedCost : null
    };
  });
  const canRecommend = results.every((result) => Number.isFinite(result.estimatedProfit));
  const preferredScenario = canRecommend
    ? results[0].estimatedProfit === results[1].estimatedProfit
      ? null
      : results[0].estimatedProfit > results[1].estimatedProfit ? results[0] : results[1]
    : null;

  return (
    <div className="what-if-dashboard">
      <section className="panel">
        <div className="what-if-heading">
          <div>
            <h3>Compare crop scenarios</h3>
            <p>Use your yield and cost assumptions with recent mandi modal prices to estimate revenue and profit.</p>
          </div>
          <span className="market-source-badge">Mandi Price API</span>
        </div>
        <div className="what-if-global-fields">
          <label>
            Area to simulate (acres)
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={areaAcres}
              onChange={(event) => setAreaAcres(event.target.value)}
            />
          </label>
          <label>
            State for mandi prices
            <select value={marketState} onChange={(event) => setMarketState(event.target.value)}>
              {WHAT_IF_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
        </div>
        <div className="what-if-scenario-grid">
          {scenarios.map((scenario, index) => {
            const priceInfo = marketPrices[scenario.crop];
            const hasPriceOverride = scenario.priceOverride.trim() !== "";
            return (
              <section className={`what-if-scenario what-if-scenario-${index + 1}`} key={`scenario-${index}`}>
                <h4>Option {index + 1}</h4>
                <div className="what-if-fields">
                  <label>
                    Crop
                    <select
                      value={scenario.crop}
                      onChange={(event) => updateScenario(index, "crop", event.target.value)}
                    >
                      {WHAT_IF_CROPS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                    </select>
                  </label>
                  <label>
                    Estimated yield (tonnes / acre)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={scenario.yieldTonsPerAcre}
                      onChange={(event) => updateScenario(index, "yieldTonsPerAcre", Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Price override (₹ / quintal, optional)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={scenario.priceOverride}
                      placeholder={priceInfo?.price ? formatMandiPrice(priceInfo.price) : "Enter if unavailable"}
                      onChange={(event) => updateScenario(index, "priceOverride", event.target.value)}
                    />
                  </label>
                  <label>
                    Estimated cost (₹ / acre)
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={scenario.costPerAcre}
                      onChange={(event) => updateScenario(index, "costPerAcre", Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Water requirement
                    <select
                      value={scenario.waterNeed}
                      onChange={(event) => updateScenario(index, "waterNeed", event.target.value)}
                    >
                      {["Low", "Medium", "High"].map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </label>
                  <label>
                    Disease risk estimate
                    <select
                      value={scenario.diseaseRisk}
                      onChange={(event) => updateScenario(index, "diseaseRisk", event.target.value)}
                    >
                      {["Low", "Medium", "High"].map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </label>
                </div>
                <p className="what-if-price-status" role="status">
                  {hasPriceOverride
                    ? "Using your manual price override."
                    : pricesLoading
                      ? `Loading recent ${scenario.crop} modal prices for ${marketState}...`
                      : priceInfo?.price
                        ? `Average of ${priceInfo.count} reported modal prices: ${formatMandiPrice(priceInfo.price)} / quintal.`
                        : priceInfo?.error || "No market price available; enter a price override to calculate returns."}
                </p>
              </section>
            );
          })}
        </div>
      </section>

      <section className="panel what-if-results">
        <div className="what-if-heading">
          <div>
            <h3>Scenario comparison</h3>
            <p>Estimated totals for {Number(areaAcres) > 0 ? Number(areaAcres).toLocaleString("en-IN") : "—"} acres.</p>
          </div>
          <span className="market-source-badge">₹ / quintal</span>
        </div>
        <div className="what-if-table-scroll">
          <table className="what-if-table">
            <thead>
              <tr>
                <th>Parameter</th>
                {results.map((result, index) => <th key={`heading-${index}`}>Option {index + 1}: {result.crop}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Expected yield</th>
                {results.map((result, index) => (
                  <td key={`yield-${index}`}>
                    {Number.isFinite(result.totalYieldTons) ? `${result.totalYieldTons.toLocaleString("en-IN", { maximumFractionDigits: 1 })} tonnes total` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Water requirement</th>
                {results.map((result, index) => <td key={`water-${index}`}>{result.waterNeed}</td>)}
              </tr>
              <tr>
                <th>Disease risk</th>
                {results.map((result, index) => <td key={`risk-${index}`}>{result.diseaseRisk}</td>)}
              </tr>
              <tr>
                <th>Expected price</th>
                {results.map((result, index) => (
                  <td key={`price-${index}`}>
                    {Number.isFinite(result.pricePerQuintal)
                      ? `${formatMandiPrice(result.pricePerQuintal)} / quintal${result.usesManualPrice ? " · manual" : ""}`
                      : "Unavailable"}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Estimated revenue</th>
                {results.map((result, index) => <td key={`revenue-${index}`}>{formatScenarioCurrency(result.estimatedRevenue)}</td>)}
              </tr>
              <tr>
                <th>Estimated cost</th>
                {results.map((result, index) => <td key={`cost-${index}`}>{formatScenarioCurrency(result.estimatedCost)}</td>)}
              </tr>
              <tr className="what-if-profit-row">
                <th>Estimated profit</th>
                {results.map((result, index) => <td key={`profit-${index}`}>{formatScenarioCurrency(result.estimatedProfit)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        {preferredScenario ? (
          <div className="what-if-recommendation" role="status">
            <CheckCircle2 size={19} />
            <p>
              <strong>{preferredScenario.crop} has the higher estimated profit</strong> under the assumptions above.
              It is marked {preferredScenario.waterNeed.toLocaleLowerCase()} water need and {preferredScenario.diseaseRisk.toLocaleLowerCase()} disease risk; compare those trade-offs before deciding.
            </p>
          </div>
        ) : canRecommend ? (
          <p className="what-if-note" role="status">Both options have the same estimated profit under the current assumptions.</p>
        ) : (
          <p className="what-if-note" role="status">Load a mandi price or enter a price override for both crops to compare profit.</p>
        )}
        <p className="what-if-disclaimer">
          Example yields, costs, water needs, and disease risks are editable planning assumptions, not predictions.
          Revenue uses reported modal prices (₹ / quintal) and 10 quintals per tonne; actual sale prices, yields, and costs may differ.
        </p>
      </section>
    </div>
  );
}

function NextBestActionPanel({ farm }) {
  const { weather, loading: weatherLoading, error: weatherError, retry: retryWeather } = useWeather(
    farm?.location,
    farm?.state
  );
  const [recordsState, setRecordsState] = useState({ loading: true, error: "", records: [] });
  const [historyState, setHistoryState] = useState({ key: "", error: "", records: [] });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/records")
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response?.data?.records)
          ? response.data.records.filter((record) => record && typeof record === "object")
          : [];
        setRecordsState({ loading: false, error: "", records });
      })
      .catch((requestError) => {
        if (active) {
          setRecordsState({
            loading: false,
            error: requestError.response?.data?.message || "Farm history could not be loaded.",
            records: []
          });
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const latestRecord = useMemo(() => (
    recordsState.records
      .filter((record) => record.cropName)
      .slice()
      .sort((left, right) => (
        new Date(right.date || right.createdAt).getTime()
        - new Date(left.date || left.createdAt).getTime()
      ))[0] || null
  ), [recordsState.records]);
  const currentCrop = latestRecord?.cropName || "";
  const historyKey = farm?.state && currentCrop
    ? `${farm.state}|${currentCrop}`
    : "";

  useEffect(() => {
    if (!historyKey) return undefined;

    let active = true;
    const [requestedState, requestedCrop] = historyKey.split("|");
    api.get("/market/prices/history", {
      params: { state: requestedState, commodity: requestedCrop }
    })
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response?.data?.records)
          ? response.data.records.filter((record) => record && typeof record === "object")
          : [];
        setHistoryState({ key: historyKey, error: "", records });
      })
      .catch((requestError) => {
        if (active) {
          setHistoryState({
            key: historyKey,
            error: requestError.response?.data?.message || "Market price history could not be loaded.",
            records: []
          });
        }
      });

    return () => {
      active = false;
    };
  }, [historyKey, refreshKey]);

  const marketHistory = historyState.key === historyKey ? historyState.records : [];
  const orderedMarketHistory = marketHistory
    .filter((record) => Number.isFinite(record.modalPrice) && dateForChart(record.arrivalDate))
    .slice()
    .sort((left, right) => dateForChart(left.arrivalDate).localeCompare(dateForChart(right.arrivalDate)));
  const firstMarketPrice = orderedMarketHistory[0]?.modalPrice;
  const latestMarketPrice = orderedMarketHistory[orderedMarketHistory.length - 1]?.modalPrice;
  const marketChangePercent = orderedMarketHistory.length > 1 && firstMarketPrice > 0
    ? ((latestMarketPrice - firstMarketPrice) / firstMarketPrice) * 100
    : null;

  const actions = useMemo(() => {
    const items = [];
    const todayForecast = weather?.daily?.[0];
    const rainChance = Number(todayForecast?.precipitationProbabilityPercent);
    const expectedRain = Number(todayForecast?.rainfallMm);
    const humidity = Number(weather?.current?.humidityPercent);

    if (!farm?.location) {
      items.push({
        priority: "Medium",
        timing: "When available",
        title: "Add your farm location",
        detail: "A farm location is needed to generate weather-aware irrigation and crop-inspection reminders.",
        source: "Farm profile",
        icon: MapIcon
      });
    } else if (todayForecast && ((Number.isFinite(rainChance) && rainChance >= 60) || expectedRain >= 5)) {
      items.push({
        priority: "High",
        timing: "Before the next irrigation",
        title: "Review irrigation timing",
        detail: `Today's forecast reports ${Number.isFinite(rainChance) ? `${rainChance}% rain chance` : "rain"}${Number.isFinite(expectedRain) ? ` and ${expectedRain} mm expected rainfall` : ""}. Check field moisture before watering; defer only if local conditions show it is not needed.`,
        source: "5-day weather forecast",
        icon: Droplets
      });
    }

    if (Number.isFinite(humidity) && humidity >= 80) {
      items.push({
        priority: "Medium",
        timing: "Today",
        title: "Inspect crops for disease symptoms",
        detail: `Relative humidity is ${humidity}%. Inspect leaves and stems; humidity alone does not confirm a disease, so identify symptoms before treating.`,
        source: "Current weather",
        icon: ShieldAlert
      });
    }

    if (marketChangePercent !== null && Math.abs(marketChangePercent) >= 5) {
      items.push({
        priority: "Medium",
        timing: "This week",
        title: marketChangePercent > 0 ? `Review the rising ${currentCrop} price` : `Review the falling ${currentCrop} price`,
        detail: `Reported modal prices changed ${marketChangePercent > 0 ? "+" : ""}${marketChangePercent.toFixed(1)}% across the available history (${formatMandiPrice(firstMarketPrice)} to ${formatMandiPrice(latestMarketPrice)} / quintal). Compare current local mandi quotes before selling.`,
        source: "Mandi Price API history",
        icon: TrendingUp
      });
    }

    const missingSoilData = ["ph", "nitrogen", "phosphorus", "potassium"]
      .filter((field) => farm?.[field] === null || farm?.[field] === undefined);
    if (missingSoilData.length) {
      items.push({
        priority: "Medium",
        timing: "When available",
        title: "Add recent soil test readings",
        detail: `The farm profile is missing ${missingSoilData.map((field) => field.toUpperCase()).join(", ")}. Adding test results can make future crop guidance more specific.`,
        source: "Farm profile",
        icon: Sprout
      });
    }

    if (!latestRecord) {
      items.push({
        priority: "Low",
        timing: "This week",
        title: "Record the current crop and latest activity",
        detail: "A recent planting or crop-care record helps connect future price and action suggestions to the right crop.",
        source: "Farm History",
        icon: History
      });
    }

    if (weatherError && !weather) {
      items.push({
        priority: "Low",
        timing: "When available",
        title: "Weather data is unavailable",
        detail: weatherError,
        source: "Weather service",
        icon: CloudSun
      });
    }

    if (!items.length) {
      items.push({
        priority: "Low",
        timing: "This week",
        title: "Continue routine monitoring",
        detail: "No elevated weather or market-price signals were found in the available data. Continue regular field checks and update farm records.",
        source: "Current farm signals",
        icon: CheckCircle2
      });
    }

    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return items.sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]);
  }, [
    currentCrop,
    farm,
    firstMarketPrice,
    latestMarketPrice,
    marketChangePercent,
    latestRecord,
    weather,
    weatherError
  ]);

  const refreshSignals = () => {
    setRefreshKey((current) => current + 1);
    retryWeather();
  };

  return (
    <div className="next-action-dashboard">
      <section className="panel next-action-toolbar">
        <div>
          <h3>Next-best-action plan</h3>
          <p>Suggested priorities for the next 7 days, based on the farm profile, weather, history and available mandi trends.</p>
        </div>
        <button className="secondary-button" type="button" onClick={refreshSignals}>
          Refresh signals
        </button>
      </section>

      {(recordsState.error || historyState.key === historyKey && historyState.error) && (
        <p className="next-action-source-warning" role="status">
          {[recordsState.error, historyState.key === historyKey ? historyState.error : ""].filter(Boolean).join(" ")}
        </p>
      )}

      <section className="panel next-action-plan">
        <div className="what-if-heading">
          <div>
            <h3>Suggested action plan</h3>
            <p>
              {[farm?.location, farm?.state, currentCrop ? `Current crop: ${currentCrop}` : ""]
                .filter(Boolean)
                .join(" · ") || "Add farm details to personalize this plan."}
            </p>
          </div>
          {(recordsState.loading || weatherLoading || (historyKey && historyState.key !== historyKey)) && (
            <span className="status-pill" role="status">Updating farm signals...</span>
          )}
        </div>
        <div className="next-action-list">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <article className="next-action-card" key={`${action.title}-${index}`}>
                <div className="next-action-icon"><Icon size={20} /></div>
                <div className="next-action-copy">
                  <div className="next-action-card-heading">
                    <strong>{action.title}</strong>
                    <span className={`next-action-priority priority-${action.priority.toLocaleLowerCase()}`}>
                      {action.priority}
                    </span>
                  </div>
                  <p>{action.detail}</p>
                  <small>{action.timing} · Source: {action.source}</small>
                </div>
              </article>
            );
          })}
        </div>
        <p className="next-action-disclaimer">
          These are decision-support reminders from available farm data, not diagnoses or guaranteed prescriptions.
          Confirm field conditions and local agronomic guidance before acting.
        </p>
      </section>
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

export default function ModulePage({ page, setActivePage, farm, onFarmUpdated }) {
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
        ) : page === "Farm Digital Twin" ? (
          <Content farm={farm} setActivePage={setActivePage} onFarmUpdated={onFarmUpdated} />
        ) : (
          <Content farm={farm} />
        )
      ) : null}
    </div>
  );
}
