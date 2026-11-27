
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
  CheckCircle2,
  LocateFixed,
  Sparkles,
  AlertCircle,
  Check,
  Info,
  FileSpreadsheet,
  MapPin,
  Award
} from "lucide-react";

const moduleDetails = {
  "Crop Recommendation": {
    icon: Sprout,
    description: "Get crop suggestions from soil nutrients, climate, and pH using a dataset-trained Random Forest.",
    features: ["N, P, and K values", "Temperature and humidity", "Soil pH and rainfall", "Top three model predictions"]
  },
  "Disease Detection": {
    icon: ScanSearch,
    description: "AI-powered crop disease detection using MobileNetV2 deep learning (PlantVillage 38-class catalog) with real-time symptoms and treatment guidance.",
    features: ["MobileNetV2 Deep Learning", "38 Crop & Disease Classes", "Instant Confidence Scoring", "Agronomic Treatment Guidance"]
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

const KARNATAKA_DISTRICTS_LIST = [
  "Raichur", "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Belagavi",
  "Kalaburagi", "Ballari", "Vijayapura", "Dharwad", "Chitradurga",
  "Mandya", "Hassan", "Shivamogga", "Tumakuru", "Kolar",
  "Chikkaballapura", "Dakshina Kannada", "Udupi", "Uttara Kannada", "Bagalkot",
  "Bidar", "Gadag", "Haveri", "Koppal", "Chamarajanagar",
  "Chikkamagaluru", "Davanagere", "Kodagu", "Ramanagara", "Yadgir", "Vijayanagara"
];

function CropRecommendationPanel({ farm }) {
  const [districts, setDistricts] = useState(KARNATAKA_DISTRICTS_LIST);
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    if (farm?.district && KARNATAKA_DISTRICTS_LIST.includes(farm.district)) {
      return farm.district;
    }
    return "Raichur";
  });
  const [taluks, setTaluks] = useState(["Raichur", "Manvi", "Sindhanur", "Devadurga", "Lingsugur", "Maski", "Sirwar"]);
  const [selectedTaluk, setSelectedTaluk] = useState(() => farm?.taluk || "Raichur");
  const [season, setSeason] = useState("Kharif");
  const [dataSource, setDataSource] = useState("benchmark"); // 'benchmark' or 'custom'
  const [micronutrients, setMicronutrients] = useState({
    organic_carbon: "0.42",
    zinc: "0.52",
    boron: "0.45",
    sulphur: "12.0"
  });

  const [form, setForm] = useState(() => ({
    N: "210",
    P: "18.5",
    K: "310",
    temperature: "27",
    humidity: "72",
    ph: "8.2",
    rainfall: "618"
  }));

  const [recommendations, setRecommendations] = useState([]);
  const [enhancedResult, setEnhancedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [cachedTimestamp, setCachedTimestamp] = useState(null);

  // Load districts on mount
  useEffect(() => {
    api.get("/crops/karnataka/districts")
      .then((res) => {
        if (Array.isArray(res.data?.districts) && res.data.districts.length > 0) {
          setDistricts(res.data.districts);
        }
      })
      .catch((err) => console.warn("Using offline Karnataka district list", err.message));
  }, []);

  // Update taluks and benchmark values when district changes
  useEffect(() => {
    if (!selectedDistrict) return;

    api.get("/crops/karnataka/taluks", { params: { district: selectedDistrict } })
      .then((res) => {
        if (Array.isArray(res.data?.taluks) && res.data.taluks.length > 0) {
          setTaluks(res.data.taluks);
          if (!res.data.taluks.includes(selectedTaluk)) {
            setSelectedTaluk(res.data.taluks[0]);
          }
        }
      })
      .catch((err) => console.warn("Using fallback taluks", err.message));

    // If using government benchmark, fetch and populate official parameters
    if (dataSource === "benchmark") {
      fetchBenchmarkForDistrict(selectedDistrict, selectedTaluk);
    }
  }, [selectedDistrict]);

  // When taluk changes in benchmark mode, refresh benchmark
  useEffect(() => {
    if (dataSource === "benchmark" && selectedDistrict) {
      fetchBenchmarkForDistrict(selectedDistrict, selectedTaluk);
    }
  }, [selectedTaluk, dataSource]);

  const fetchBenchmarkForDistrict = async (districtName, talukName) => {
    try {
      const [soilRes, rainRes] = await Promise.allSettled([
        api.get("/crops/karnataka/soil", { params: { district: districtName, taluk: talukName } }),
        api.get("/crops/karnataka/rainfall", { params: { district: districtName, taluk: talukName } })
      ]);

      const soil = soilRes.status === "fulfilled" ? soilRes.value.data?.soil : null;
      const rain = rainRes.status === "fulfilled" ? rainRes.value.data?.rainfall : null;

      if (soil) {
        setForm((prev) => ({
          ...prev,
          N: soil.nitrogen != null ? String(soil.nitrogen) : prev.N,
          P: soil.phosphorus != null ? String(soil.phosphorus) : prev.P,
          K: soil.potassium != null ? String(soil.potassium) : prev.K,
          ph: soil.ph != null ? String(soil.ph) : prev.ph
        }));
        setMicronutrients({
          organic_carbon: soil.organic_carbon_percent != null ? String(soil.organic_carbon_percent) : "0.50",
          zinc: soil.zinc_ppm != null ? String(soil.zinc_ppm) : "0.60",
          boron: soil.boron_ppm != null ? String(soil.boron_ppm) : "0.50",
          sulphur: soil.sulphur_ppm != null ? String(soil.sulphur_ppm) : "15.0"
        });
      }

      if (rain) {
        setForm((prev) => ({
          ...prev,
          rainfall: rain.annual_rainfall_mm != null ? String(Math.round(rain.annual_rainfall_mm)) : prev.rainfall
        }));
      }
    } catch (err) {
      console.warn("Could not fetch remote benchmark, keeping baseline", err.message);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please select your district manually.");
      return;
    }

    setDetectingLocation(true);
    setStatusMessage("Acquiring GPS coordinates...");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          setStatusMessage("Resolving Karnataka district and taluk...");
          const res = await api.get("/auth/reverse-geocode", {
            params: { lat: latitude, lon: longitude }
          });
          const addr = res.data?.address;
          if (addr?.district) {
            const matched = districts.find(
              (d) => d.toLowerCase() === addr.district.toLowerCase() || addr.district.toLowerCase().includes(d.toLowerCase())
            );
            if (matched) {
              setSelectedDistrict(matched);
              if (addr.village || addr.city) {
                setSelectedTaluk(addr.village || addr.city);
              }
              setStatusMessage(`Location identified: ${matched} District (${addr.village || addr.city || "Karnataka"})`);
            } else {
              setStatusMessage(`Coordinates [${latitude.toFixed(3)}, ${longitude.toFixed(3)}] detected. Set district manually if needed.`);
            }
          } else {
            setStatusMessage(`Coordinates [${latitude.toFixed(3)}, ${longitude.toFixed(3)}] detected.`);
          }
        } catch {
          setStatusMessage(`GPS coordinates [${latitude.toFixed(3)}, ${longitude.toFixed(3)}] acquired.`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        setDetectingLocation(false);
        setError(`Location access: ${geoError.message || "Permission denied or GPS unavailable. Select your district below."}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getRecommendations = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const inputs = {
        N: Number(form.N),
        P: Number(form.P),
        K: Number(form.K),
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        ph: Number(form.ph),
        rainfall: Number(form.rainfall),
        district: selectedDistrict,
        taluk: selectedTaluk,
        season,
        is_actual_soil_test: dataSource === "custom"
      };

      const response = await api.post("/crops/recommend", inputs);
      const data = response.data;
      const recs = data.recommendations || [];
      setRecommendations(recs);
      setEnhancedResult(data);
      setIsOffline(false);

      try {
        localStorage.setItem(
          "agrisaarthi_cached_crop_rec",
          JSON.stringify({
            recommendations: recs,
            enhancedResult: data,
            timestamp: new Date().toISOString()
          })
        );
      } catch (storageError) {
        console.warn("Storage warning", storageError);
      }
    } catch (requestError) {
      // Offline fallback to cached recommendations
      const cached = localStorage.getItem("agrisaarthi_cached_crop_rec");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRecommendations(parsed.recommendations || []);
          setEnhancedResult(parsed.enhancedResult || null);
          setIsOffline(true);
          setCachedTimestamp(parsed.timestamp);
          setError("");
        } catch (e) {
          setError(requestError.response?.data?.message || "Crop recommendation service is temporarily unavailable.");
        }
      } else {
        setError(requestError.response?.data?.message || "Crop recommendation service is temporarily unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  const topCrops = enhancedResult?.top_three_recommendations || recommendations.map((r, i) => ({
    crop: r.crop,
    canonical_name: r.crop.charAt(0).toUpperCase() + r.crop.slice(1),
    suitability_score: r.score_percent || Math.round((r.score || 0) * 100),
    ml_model_score: r.score_percent || Math.round((r.score || 0) * 100),
    suitable_seasons: ["Kharif", "Rabi"],
    active_season_match: true,
    regional_production_status: "Cultivated in Karnataka Agro-Climatic Zone",
    required_soil_conditions: {
      nitrogen_range: "60-100 kg/ha",
      phosphorus_range: "35-65 kg/ha",
      potassium_range: "30-50 kg/ha",
      ph_range: "5.5-7.5",
      rainfall_range: "600-1200 mm"
    },
    available_soil_conditions: {
      nitrogen: `${form.N} kg/ha`,
      phosphorus: `${form.P} kg/ha`,
      potassium: `${form.K} kg/ha`,
      ph: `${form.ph}`,
      rainfall: `${form.rainfall} mm`,
      provenance: dataSource === "benchmark" ? "Karnataka Benchmark" : "Soil Test"
    },
    rainfall_suitability: "Satisfies Crop Water Demand",
    explanation: `Recommended based on Random Forest model and ${selectedDistrict} soil and rainfall patterns.`
  }));

  const soilDeficiencies = enhancedResult?.soil_health_deficiencies || [];
  const soilAdvisories = enhancedResult?.soil_management_suggestions || [];

  return (
    <div className="module-content-grid" style={{ gap: "20px" }}>
      {/* Input Configuration Panel */}
      <form className="panel" onSubmit={getRecommendations} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Header & Location Detection */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sprout size={20} color="#16a34a" />
              Karnataka Crop Recommendation System
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
              Location-aware ML engine backed by DAC&FW Soil Health Portal & DES Historical Production Data.
            </p>
          </div>
          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="secondary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0"
            }}
          >
            <LocateFixed size={14} />
            <span>{detectingLocation ? "Detecting..." : "Detect My Location (GPS)"}</span>
          </button>
        </div>

        {statusMessage && (
          <div style={{ fontSize: "12px", color: "#15803d", backgroundColor: "#f0fdf4", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={15} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Location & Season Selection Row */}
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong style={{ display: "block", fontSize: "12px", color: "#334155", marginBottom: "8px" }}>
            📍 Select Agricultural Location & Growing Season
          </strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
              State
              <input
                type="text"
                value="Karnataka"
                disabled
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", marginTop: "4px", fontSize: "12px" }}
              />
            </label>

            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
              District
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px", fontSize: "12px" }}
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
              Taluk / Hobli
              <select
                value={selectedTaluk}
                onChange={(e) => setSelectedTaluk(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px", fontSize: "12px" }}
              >
                {taluks.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
              Agricultural Season
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px", fontSize: "12px" }}
              >
                <option value="Kharif">Kharif (Monsoon, Jun-Oct)</option>
                <option value="Rabi">Rabi (Winter, Nov-Feb)</option>
                <option value="Summer">Summer (Zaid, Mar-May)</option>
              </select>
            </label>
          </div>
        </div>

        {/* Soil Data Mode Selector */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              setDataSource("benchmark");
              fetchBenchmarkForDistrict(selectedDistrict, selectedTaluk);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "6px",
              border: dataSource === "benchmark" ? "2px solid #16a34a" : "1px solid #cbd5e1",
              backgroundColor: dataSource === "benchmark" ? "#f0fdf4" : "#ffffff",
              color: dataSource === "benchmark" ? "#166534" : "#475569",
              cursor: "pointer"
            }}
          >
            🏛 Use Karnataka Official Benchmark (DAC&FW / NFSM)
          </button>
          <button
            type="button"
            onClick={() => setDataSource("custom")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "6px",
              border: dataSource === "custom" ? "2px solid #16a34a" : "1px solid #cbd5e1",
              backgroundColor: dataSource === "custom" ? "#f0fdf4" : "#ffffff",
              color: dataSource === "custom" ? "#166534" : "#475569",
              cursor: "pointer"
            }}
          >
            📋 Enter My Soil Test / Soil Health Card
          </button>
        </div>

        {dataSource === "benchmark" ? (
          <div style={{ fontSize: "11px", color: "#1e40af", backgroundColor: "#eff6ff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bfdbfe", lineHeight: 1.5 }}>
            <strong>ℹ Regional Benchmark Active:</strong> Values below are official DAC&FW Soil Health Card averages for <strong>{selectedDistrict}</strong> district (NFSM Survey data). <em>Note: District averages represent regional profiles and do not substitute for individual laboratory soil testing.</em>
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "#854d0e", backgroundColor: "#fefce8", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fef08a", lineHeight: 1.5 }}>
            <strong>✏ Soil Health Card Entry:</strong> Enter the exact N-P-K, pH, and micronutrient values from your printed Soil Health Card or laboratory soil report.
          </div>
        )}

        {/* Soil and Climate Numerical Inputs */}
        <div className="module-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          <label>
            Nitrogen (N) kg/ha
            <input
              type="number"
              step="0.1"
              min="0"
              max="200"
              value={form.N}
              onChange={(e) => setForm({ ...form, N: e.target.value })}
              required
            />
          </label>
          <label>
            Phosphorus (P) kg/ha
            <input
              type="number"
              step="0.1"
              min="0"
              max="200"
              value={form.P}
              onChange={(e) => setForm({ ...form, P: e.target.value })}
              required
            />
          </label>
          <label>
            Potassium (K) kg/ha
            <input
              type="number"
              step="0.1"
              min="0"
              max="300"
              value={form.K}
              onChange={(e) => setForm({ ...form, K: e.target.value })}
              required
            />
          </label>
          <label>
            Soil pH
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              value={form.ph}
              onChange={(e) => setForm({ ...form, ph: e.target.value })}
              required
            />
          </label>
          <label>
            Rainfall (mm)
            <input
              type="number"
              step="1"
              min="0"
              max="5000"
              value={form.rainfall}
              onChange={(e) => setForm({ ...form, rainfall: e.target.value })}
              required
            />
          </label>
          <label>
            Temperature (°C)
            <input
              type="number"
              step="0.5"
              min="-10"
              max="60"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              required
            />
          </label>
          <label>
            Humidity (%)
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.humidity}
              onChange={(e) => setForm({ ...form, humidity: e.target.value })}
              required
            />
          </label>
        </div>

        {/* Micronutrients row */}
        <div style={{ background: "#fafafa", padding: "10px 12px", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "6px" }}>
            🔬 Soil Health Card Micronutrients & Organic Carbon ({selectedDistrict})
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px", fontSize: "11px" }}>
            <div>
              <span style={{ color: "#64748b" }}>Organic Carbon: </span>
              <strong>{micronutrients.organic_carbon}%</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Zinc (Zn): </span>
              <strong>{micronutrients.zinc} ppm</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Boron (B): </span>
              <strong>{micronutrients.boron} ppm</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Sulphur (S): </span>
              <strong>{micronutrients.sulphur} ppm</strong>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="primary-button"
          disabled={loading}
          style={{
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: "700",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <Sparkles size={16} />
          {loading ? "Evaluating regional suitability & ML models..." : "Get Location-Aware Crop Recommendations"}
        </button>
      </form>

      {/* Output Recommendations Panel */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#166534" }}>
            Top 3 Recommended Crops
          </h3>
          {enhancedResult?.location && (
            <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "12px", fontWeight: "600" }}>
              {enhancedResult.location.district} • {enhancedResult.selected_season || season} Season
            </span>
          )}
        </div>

        {isOffline && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", padding: "10px 14px", borderRadius: "8px", fontSize: "12px" }}>
            <strong>⚡ Offline Mode</strong>
            <p style={{ margin: "4px 0 0" }}>Displaying last saved recommendations cached on your device{cachedTimestamp ? ` (${new Date(cachedTimestamp).toLocaleDateString()})` : ""}.</p>
          </div>
        )}

        {error ? (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div><strong>Recommendations unavailable</strong><p>{error}</p></div>
          </div>
        ) : recommendations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
            <Sprout size={48} color="#94a3b8" style={{ marginBottom: "12px" }} />
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>
              Select your Karnataka district and season, verify soil parameters, and click <strong>Get Recommendations</strong>.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Our Random Forest agronomic model evaluates regional soil suitability, historical district production records, and rainfall norms.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {topCrops.map((crop, index) => (
              <div
                key={crop.crop}
                style={{
                  background: "#ffffff",
                  border: index === 0 ? "2px solid #22c55e" : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  position: "relative"
                }}
              >
                {/* Header with Title and Suitability Score */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: index === 0 ? "#16a34a" : "#64748b",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "12px"
                      }}>
                        {index + 1}
                      </span>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                        {crop.canonical_name || crop.crop}
                      </strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: crop.active_season_match ? "#dcfce7" : "#fef3c7", color: crop.active_season_match ? "#166534" : "#854d0e", fontWeight: "600" }}>
                        {crop.active_season_match ? `✓ Ideal for ${season}` : `ℹ Sowing Season: ${(crop.suitable_seasons || []).join(", ")}`}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#f1f5f9", color: "#334155" }}>
                        {crop.regional_production_status || "Karnataka Agro-Zone"}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: "18px",
                      fontWeight: "800",
                      color: crop.suitability_score >= 80 ? "#16a34a" : crop.suitability_score >= 60 ? "#ca8a04" : "#dc2626"
                    }}>
                      {crop.suitability_score}%
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Suitability Score
                    </span>
                  </div>
                </div>

                {/* Required vs Available Parameters Comparison Grid */}
                {crop.required_soil_conditions && crop.available_soil_conditions && (
                  <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", margin: "10px 0", border: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                      📊 Required vs. Available Soil & Climate Conditions:
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", fontSize: "11px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Nitrogen (N): </span>
                        <div><strong>Avail:</strong> {crop.available_soil_conditions.nitrogen}</div>
                        <div><strong>Req:</strong> {crop.required_soil_conditions.nitrogen_range}</div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Phosphorus (P): </span>
                        <div><strong>Avail:</strong> {crop.available_soil_conditions.phosphorus}</div>
                        <div><strong>Req:</strong> {crop.required_soil_conditions.phosphorus_range}</div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Potassium (K): </span>
                        <div><strong>Avail:</strong> {crop.available_soil_conditions.potassium}</div>
                        <div><strong>Req:</strong> {crop.required_soil_conditions.potassium_range}</div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Soil pH: </span>
                        <div><strong>Avail:</strong> {crop.available_soil_conditions.ph}</div>
                        <div><strong>Req:</strong> {crop.required_soil_conditions.ph_range}</div>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Water / Rain: </span>
                        <div><strong>Avail:</strong> {crop.available_soil_conditions.rainfall}</div>
                        <div><strong>Req:</strong> {crop.required_soil_conditions.rainfall_range}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rainfall Suitability & Water Advisory */}
                {crop.rainfall_suitability && (
                  <div style={{ fontSize: "11px", color: "#0369a1", backgroundColor: "#f0f9ff", padding: "6px 10px", borderRadius: "6px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Droplets size={13} color="#0284c7" />
                    <span><strong>Water Advisory:</strong> {crop.rainfall_suitability}</span>
                  </div>
                )}

                {/* Agronomic Explanation */}
                {crop.explanation && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
                    {crop.explanation}
                  </p>
                )}
              </div>
            ))}

            {/* Soil Deficiencies and Nutrient Management Card */}
            {soilDeficiencies.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px" }}>
                <strong style={{ color: "#92400e", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", marginBottom: "8px" }}>
                  <AlertCircle size={16} color="#d97706" />
                  {selectedDistrict} District Soil Deficiencies & Nutrient Management Advisory
                </strong>
                <ul style={{ margin: "0 0 10px 0", paddingLeft: "20px", color: "#78350f", fontSize: "12px" }}>
                  {soilDeficiencies.map((def, idx) => (
                    <li key={idx} style={{ marginBottom: "2px" }}>{def}</li>
                  ))}
                </ul>
                {soilAdvisories.length > 0 && (
                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #fef3c7" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#92400e", display: "block", marginBottom: "4px" }}>
                      💡 Recommended Agronomic Interventions:
                    </span>
                    <ul style={{ margin: 0, paddingLeft: "16px", color: "#451a03", fontSize: "11px" }}>
                      {soilAdvisories.map((adv, idx) => (
                        <li key={idx} style={{ marginBottom: "2px" }}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Official Provenance and Scientific Disclaimer */}
            <div style={{ fontSize: "11px", color: "#64748b", background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", lineHeight: 1.5 }}>
              <strong>🏛 Government Data Provenance:</strong> Soil benchmarks compiled from DAC&FW Soil Health Card Portal (<code>soilhealth.dac.gov.in</code>) and NFSM Karnataka dataset. Historical crop production patterns validated against Directorate of Economics and Statistics (DES, <code>data.gov.in</code>). Normal rainfall norms verified via IMD and KSNDMC. Recommendations provide decision support and do not guarantee yield.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiseaseDetectionPanel({ farm }) {
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
          || "The disease detection catalog is unavailable right now."
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
  const prediction = result?.prediction;

  return (
    <div className="module-content-grid">
      <form className="panel disease-upload-form" onSubmit={handleAnalyze}>
        <h3>Check a crop leaf</h3>
        <div className="module-form-grid">
          <label>
            Crop
            <select value={crop} onChange={(event) => setCrop(event.target.value)} required>
              <option value="">Select a crop</option>
              <option value="Apple">Apple</option>
              <option value="Blueberry">Blueberry</option>
              <option value="Cherry">Cherry</option>
              <option value="Chilli">Chilli</option>
              <option value="Corn (Maize)">Corn (Maize)</option>
              <option value="Cotton">Cotton</option>
              <option value="Grape">Grape</option>
              <option value="Orange">Orange</option>
              <option value="Peach">Peach</option>
              <option value="Pepper, Bell">Pepper (Bell)</option>
              <option value="Potato">Potato</option>
              <option value="Raspberry">Raspberry</option>
              <option value="Rice">Rice</option>
              <option value="Soybean">Soybean</option>
              <option value="Squash">Squash</option>
              <option value="Strawberry">Strawberry</option>
              <option value="Tomato">Tomato</option>
              <option value="Wheat">Wheat</option>
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
          Deep learning disease analysis is powered by MobileNetV2 trained across 38 crop & disease conditions.
        </p>
        {catalogCount !== null ? (
          <p className="disease-catalog-status">
            MobileNetV2 AI Catalog: {catalogCount} identifiable crop and pathology classes.
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
        {loading && <div className="status-pill" role="status">Analyzing leaf image with MobileNetV2 AI...</div>}
      </form>

      <div className="panel disease-results-panel" aria-live="polite">
        <h3>AI Diagnosis & Recommendations</h3>

        {prediction ? (
          <div className="mobilenet-diagnosis-container">
            <div className="disease-result-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span className={`status-pill ${prediction.is_healthy ? "healthy-pill" : "disease-pill"}`} style={{ padding: "0.35rem 0.75rem", borderRadius: "1rem", fontWeight: "600", fontSize: "0.85rem", background: prediction.is_healthy ? "rgba(38, 148, 93, 0.15)" : "rgba(220, 38, 38, 0.15)", color: prediction.is_healthy ? "#26945d" : "#dc2626", border: `1px solid ${prediction.is_healthy ? "#26945d" : "#dc2626"}` }}>
                {prediction.is_healthy ? "✓ Healthy Plant" : "⚠ Disease Detected"}
              </span>
              <strong style={{ fontSize: "1.1rem", color: "#1b4d3e" }}>
                {prediction.confidence_percent || Math.round(prediction.confidence * 100)}% Confidence
              </strong>
            </div>

            <h2 style={{ margin: "0.5rem 0 1rem 0", color: "#111827", fontSize: "1.4rem" }}>
              {prediction.prediction}
            </h2>

            <p className="disease-result-caveat" style={{ marginBottom: "1rem" }}>
              Classified using <strong>{result.model || "MobileNetV2 (PlantVillage)"}</strong>. Confirm diagnosis with a local agronomist before spraying.
            </p>

            {prediction.symptoms && prediction.symptoms.length > 0 && (
              <div className="disease-guidance" style={{ marginBottom: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
                <strong style={{ color: "#1e3a8a", display: "block", marginBottom: "0.5rem" }}>Observed Symptoms:</strong>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#334155" }}>
                  {prediction.symptoms.map((symptom, idx) => (
                    <li key={idx} style={{ marginBottom: "0.25rem" }}>{symptom}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.recommendation && (
              <div className="disease-guidance" style={{ marginBottom: "1.5rem", background: "#f0fdf4", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid #26945d" }}>
                <strong style={{ color: "#166534", display: "block", marginBottom: "0.5rem" }}>Recommended Treatment & Prevention:</strong>
                <p style={{ margin: 0, color: "#14532d", lineHeight: "1.5" }}>{prediction.recommendation}</p>
              </div>
            )}

            {prediction.top_predictions && prediction.top_predictions.length > 1 && (
              <div style={{ marginTop: "1.5rem" }}>
                <strong style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.95rem", color: "#4b5563" }}>Top Match Probabilities:</strong>
                <div className="disease-result-list">
                  {prediction.top_predictions.map((match, idx) => (
                    <article className="disease-result-card" key={idx} style={{ padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
                      <div className="disease-result-heading" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Match #{idx + 1}: {match.class}</span>
                        <strong>{match.score_percent || Math.round(match.score * 100)}%</strong>
                      </div>
                      <div style={{ width: "100%", background: "#e5e7eb", height: "6px", borderRadius: "3px", marginTop: "0.4rem", overflow: "hidden" }}>
                        <div style={{ width: `${match.score_percent || match.score * 100}%`, background: idx === 0 ? "#26945d" : "#94a3b8", height: "100%" }} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : results.length ? (
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
                        Confidence score: {match.score.toFixed(3)}.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            {result?.recommendation ? (
              <div className="disease-guidance">
                <strong>Prevention and treatment</strong>
                <p>{result.recommendation}</p>
              </div>
            ) : null}
          </>
        ) : result ? (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div>
              <strong>No disease match returned</strong>
              <p>{result.message} The crop or pathology may not be in the supported catalog. Try a clear leaf image or seek local expert advice.</p>
            </div>
          </div>
        ) : (
          <div className="risk-box">
            <ShieldAlert size={18} />
            <div>
              <strong>Ready to check</strong>
              <p>Upload a leaf image and select its crop to view deep learning disease diagnosis.</p>
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
  const { weather, loading, error, retry } = useWeather(
    farm?.location,
    farm?.state,
    farm?.latitude,
    farm?.longitude,
    farm?._id
  );
  const location = weather?.location;
  const current = weather?.current;
  const timezoneOffsetSeconds = location?.timezoneOffsetSeconds || 0;
  const hasFarmLocation = Boolean(farm?.location?.trim() || (farm?.latitude && farm?.longitude));
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

function SoilPanel({ farm }) {
  return <SoilIntelligence farm={farm} />;
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
    farm?.state,
    farm?.latitude,
    farm?.longitude,
    farm?._id
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

function MarketPanel({ farm }) {
  const [draftFilters, setDraftFilters] = useState(() => ({
    ...EMPTY_MARKET_FILTERS,
    state: farm?.state || "",
    district: farm?.district || ""
  }));
  const [activeFilters, setActiveFilters] = useState(() => ({
    ...EMPTY_MARKET_FILTERS,
    state: farm?.state || "",
    district: farm?.district || ""
  }));
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
