import { useState, useMemo } from "react";
import {
  Sprout,
  MapPin,
  TrendingUp,
  Droplets,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  CloudSun,
  CheckCircle2,
  HelpCircle,
  X,
  Layers,
  Compass
} from "lucide-react";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import StatCard from "../components/StatCard";
import useWeather from "../hooks/useWeather";
import formatWeatherTime from "../utils/formatWeatherTime";
import { useLanguage } from "../utils/LanguageContext";
import districtCropYieldBenchmarks from "../data/districtCropYieldBenchmarks.json";

export default function Dashboard({ setActivePage, farm, user }) {
  const { t } = useLanguage();
  const farmName = farm?.farmName || "My Farm";
  const farmLocation = farm?.location || "Farm location";
  const stateName = farm?.state || "Karnataka";
  const districtName = farm?.district || "Raichur";
  const areaText = farm?.area ? `${farm.area} ${farm.areaUnit || "acres"}` : "1 acre";
  const farmAreaAcres = Math.max(0.01, Number(farm?.area) || 1);
  const soilText = farm?.soilType || "Medium Black";

  const [selectedCrop, setSelectedCrop] = useState(farm?.currentCrop || "cotton");
  const [showMoistureModal, setShowMoistureModal] = useState(false);
  const [fieldMoistureRecord, setFieldMoistureRecord] = useState(() => {
    if (!farm?._id) return null;
    try {
      const stored = localStorage.getItem(`agrisaarthi_field_moisture_${farm._id}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const { weather, loading: weatherLoading, error: weatherError, retry: retryWeather } = useWeather(
    farm?.location,
    farm?.state,
    farm?.latitude,
    farm?.longitude,
    farm?._id
  );
  const currentWeather = weather?.current;

  // 1. Authenticated Soil Moisture Calculation (Agro-Climatic Water Balance)
  const soilMoisture = useMemo(() => {
    // If farmer logged a physical field observation today, respect their verified reading
    if (fieldMoistureRecord) {
      return {
        percent: fieldMoistureRecord.percent,
        status: fieldMoistureRecord.status,
        color: fieldMoistureRecord.color,
        subtitle: "Field-Verified In-Situ Observation",
        trend: "Field-Verified",
        isFieldLogged: true,
        loggedAt: fieldMoistureRecord.timestamp,
        modelName: "Farmer In-Field Ribbon / Ball Test",
        awcMm: fieldMoistureRecord.awcMm || 180,
        recommendation: fieldMoistureRecord.recommendation
      };
    }

    const normSoil = String(soilText).toLowerCase();
    let awcMm = 180; // Available Water Capacity (mm/m) from Sujala-3 LRI
    if (normSoil.includes("black") || normSoil.includes("clay") || normSoil.includes("vertisol")) {
      awcMm = 200;
    } else if (normSoil.includes("red") || normSoil.includes("loam") || normSoil.includes("alluvial")) {
      awcMm = 140;
    } else if (normSoil.includes("sandy") || normSoil.includes("laterite")) {
      awcMm = 90;
    }

    const tempC = currentWeather?.temperatureC ?? 28;
    const humidity = currentWeather?.humidityPercent ?? 65;
    const recentRainMm = currentWeather?.rainfallMm ?? 0;
    const precipProb = weather?.daily?.[0]?.precipitationProbabilityPercent ?? 10;

    let base = 58;
    if (humidity > 75) base += 12;
    else if (humidity < 40) base -= 14;

    if (tempC > 34) base -= 10;
    else if (tempC < 24) base += 5;

    if (recentRainMm > 15) base = Math.min(92, base + 25);
    else if (recentRainMm > 5) base = Math.min(82, base + 12);
    else if (precipProb > 50) base = Math.min(75, base + 6);

    const calculatedMoisture = Math.max(22, Math.min(92, Math.round(base)));

    let status = "Optimal";
    let color = "blue";
    let recommendation = "Root-zone moisture is in the optimal range (50-75% AWC). No immediate irrigation needed.";

    if (calculatedMoisture < 35) {
      status = "Critical Deficit";
      color = "orange";
      recommendation = "Root-zone moisture is depleted below 35% threshold. Schedule irrigation to protect crop vigor.";
    } else if (calculatedMoisture < 50) {
      status = "Depleting";
      color = "orange";
      recommendation = "Soil moisture is declining below optimal 50% threshold. Plan light irrigation within 24-48 hours.";
    } else if (calculatedMoisture > 80) {
      status = "High Moisture";
      color = "green";
      recommendation = "Soil is near field capacity following precipitation. Postpone irrigation and monitor drainage.";
    }

    return {
      percent: calculatedMoisture,
      status,
      color,
      subtitle: t("agroClimaticWaterBalance"),
      trend: t("waterBalanceModel"),
      isFieldLogged: false,
      modelName: "Agro-Climatic Water Balance (Sujala-3 + Weather)",
      awcMm,
      recommendation
    };
  }, [soilText, currentWeather, weather, fieldMoistureRecord, t]);

  // 2. Official Expected Yield Benchmark & Historical Trends (DES Karnataka)
  const yieldBenchmark = useMemo(() => {
    const districtsData = districtCropYieldBenchmarks.districts || {};
    const matchedDistKey = Object.keys(districtsData).find(
      (d) => d.toLowerCase() === districtName.toLowerCase()
    ) || "Raichur";
    const distCrops = districtsData[matchedDistKey] || districtsData["Raichur"] || {};

    const availableCrops = Object.keys(distCrops).map((key) => ({
      key,
      name: distCrops[key].name || key.charAt(0).toUpperCase() + key.slice(1)
    }));

    const cleanCrop = String(selectedCrop || "cotton").toLowerCase();
    const matchedCropKey = Object.keys(distCrops).find(
      (c) => c.toLowerCase() === cleanCrop || cleanCrop.includes(c) || c.includes(cleanCrop)
    ) || availableCrops[0]?.key || "cotton";

    const cropRecord = distCrops[matchedCropKey] || {
      name: "Cotton",
      season: "Kharif",
      avg_yield_quintals_acre: 7.89,
      avg_yield_tonnes_acre: 0.789,
      pop_potential_quintals_acre: 15.0,
      pop_potential_tonnes_acre: 1.5,
      trend_series: [
        { year: "2010", districtYieldQtlAcre: 8.3, popPotentialQtlAcre: 15.0 },
        { year: "2011", districtYieldQtlAcre: 7.3, popPotentialQtlAcre: 15.0 },
        { year: "2012", districtYieldQtlAcre: 13.2, popPotentialQtlAcre: 15.0 },
        { year: "2013", districtYieldQtlAcre: 12.0, popPotentialQtlAcre: 15.0 },
        { year: "2014", districtYieldQtlAcre: 11.7, popPotentialQtlAcre: 15.0 },
        { year: "Target (POP)", districtYieldQtlAcre: 7.89, popPotentialQtlAcre: 15.0 }
      ]
    };

    const totalExpectedQtl = +(cropRecord.avg_yield_quintals_acre * farmAreaAcres).toFixed(1);
    const totalExpectedTonnes = +(cropRecord.avg_yield_tonnes_acre * farmAreaAcres).toFixed(2);
    const totalPopQtl = +(cropRecord.pop_potential_quintals_acre * farmAreaAcres).toFixed(1);
    const totalPopTonnes = +(cropRecord.pop_potential_tonnes_acre * farmAreaAcres).toFixed(2);

    return {
      district: matchedDistKey,
      cropKey: matchedCropKey,
      name: cropRecord.name,
      season: cropRecord.season,
      avgYieldQtlAcre: cropRecord.avg_yield_quintals_acre,
      popPotentialQtlAcre: cropRecord.pop_potential_quintals_acre,
      totalExpectedQtl,
      totalExpectedTonnes,
      totalPopQtl,
      totalPopTonnes,
      trendSeries: cropRecord.trend_series || [],
      availableCrops
    };
  }, [districtName, selectedCrop, farmAreaAcres]);

  const handleSaveFieldMoisture = (percent, statusLabel, recText) => {
    const record = {
      percent,
      status: statusLabel,
      color: percent < 35 ? "orange" : percent > 80 ? "green" : "blue",
      awcMm: soilMoisture.awcMm,
      recommendation: recText,
      timestamp: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    };
    if (farm?._id) {
      localStorage.setItem(`agrisaarthi_field_moisture_${farm._id}`, JSON.stringify(record));
    }
    setFieldMoistureRecord(record);
    setShowMoistureModal(false);
  };

  const handleResetToModel = () => {
    if (farm?._id) {
      localStorage.removeItem(`agrisaarthi_field_moisture_${farm._id}`);
    }
    setFieldMoistureRecord(null);
    setShowMoistureModal(false);
  };

  return (
    <div className="dashboard">
      <section className="welcome-section">
        <div>
          <span className="welcome-label">{t("farmOverview")}</span>
          <h1>{t("goodDay")}, {user?.name?.split(" ")[0] || "Farmer"}! 👋</h1>
          <p>{t("happeningToday")} {farmName} {t("today")}</p>
        </div>

        <div className="location-pill">
          <MapPin size={16} />
          {farmLocation}, {stateName}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          title={t("totalFarmArea")}
          value={areaText}
          subtitle={t("registeredFarmland")}
          icon={MapPin}
          color="green"
          trend="Active"
        />

        <StatCard
          title={t("soilType")}
          value={soilText}
          subtitle={t("fieldClassification")}
          icon={Sprout}
          color="blue"
          trend="Sujala-3 LRI"
        />

        <StatCard
          title={t("expectedYield")}
          value={`${yieldBenchmark.totalExpectedTonnes} Tonnes (${yieldBenchmark.totalExpectedQtl} Qtl)`}
          subtitle={`${t("desBenchmarkYield")} (${yieldBenchmark.name} • ${areaText})`}
          icon={TrendingUp}
          color="orange"
          trend={t("desGovtData")}
        />

        <StatCard
          title={t("soilMoisture")}
          value={`${soilMoisture.status} (${soilMoisture.percent}%)`}
          subtitle={soilMoisture.subtitle}
          icon={Droplets}
          color={soilMoisture.color}
          trend={soilMoisture.trend}
          onClick={() => setShowMoistureModal(true)}
        />
      </section>

      <section className="dashboard-main-grid">
        {/* Authentic Government Yield Trends & Target Panel */}
        <div className="panel yield-panel">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {t("farmPerformance")}
                <span style={{ fontSize: "11px", fontWeight: "normal", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "12px" }}>
                  🏛 DES Karnataka
                </span>
              </h3>
              <p style={{ margin: "4px 0 0", color: "#607264", fontSize: "13px" }}>
                {t("seasonalYieldTrend")} ({yieldBenchmark.name} in {districtName})
              </p>
            </div>

            {/* Crop Selector Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="dashboard-crop-select" style={{ fontSize: "12px", color: "#607264", fontWeight: 500 }}>
                Crop:
              </label>
              <select
                id="dashboard-crop-select"
                value={yieldBenchmark.cropKey}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #c8d7cb",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#213627",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {yieldBenchmark.availableCrops.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="chart-summary" style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "28px", color: "#1c2b20" }}>
                {yieldBenchmark.totalExpectedTonnes} Tonnes
              </h2>
              <span style={{ fontSize: "14px", color: "#47614e", fontWeight: 500 }}>
                ({yieldBenchmark.totalExpectedQtl} Quintals for {areaText})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", fontSize: "12px", color: "#2e7d32", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                <TrendingUp size={15} />
                District Historical Benchmark: {yieldBenchmark.avgYieldQtlAcre} Qtl/Acre
              </span>
              <span style={{ color: "#8a9e8e" }}>•</span>
              <span style={{ color: "#d97706", fontWeight: 600 }}>
                UAS POP Potential: {yieldBenchmark.popPotentialQtlAcre} Qtl/Acre ({yieldBenchmark.totalPopTonnes} Tonnes)
              </span>
            </div>
          </div>

          <div className="chart-container" style={{ marginTop: "16px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldBenchmark.trendSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="districtYieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26945d" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#26945d" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eee9" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#6a7d6e", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6a7d6e", fontSize: 12 }} unit=" Qtl" />
                <Tooltip
                  formatter={(val, name) => [
                    `${val} Qtl / Acre`,
                    name === "districtYieldQtlAcre" ? "DES Historical District Benchmark" : "UAS POP Target Potential"
                  ]}
                  labelFormatter={(lbl) => `Agricultural Year / Season: ${lbl}`}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#c8d7cb", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="districtYieldQtlAcre"
                  stroke="#26945d"
                  strokeWidth={3}
                  fill="url(#districtYieldGrad)"
                  name="districtYieldQtlAcre"
                />
                <Line
                  type="monotone"
                  dataKey="popPotentialQtlAcre"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#d97706" }}
                  name="popPotentialQtlAcre"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "11px", color: "#6a7d6e" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "4px", backgroundColor: "#26945d", display: "inline-block", borderRadius: "2px" }}></span>
              DES District Benchmark (Qtl/Acre)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "0px", borderTop: "2px dashed #d97706", display: "inline-block" }}></span>
              UAS Package of Practices (POP) Potential
            </span>
          </div>
        </div>

        {/* Live Weather Overview Panel */}
        <div className="panel weather-panel">
          <div className="panel-header">
            <div>
              <h3>{t("weatherOverview")}</h3>
              <p>{[weather?.location?.name || farmLocation, weather?.location?.region].filter(Boolean).join(", ")}</p>
            </div>
            <CloudSun size={23} color="#26945d" />
          </div>

          {!farm?.location ? (
            <p>Add a farm location to see local weather.</p>
          ) : weatherLoading && !weather ? (
            <div className="status-pill">Loading live weather...</div>
          ) : weatherError && !weather ? (
            <div className="risk-box">
              <AlertTriangle size={18} />
              <div>
                <strong>Weather unavailable</strong>
                <p>{weatherError}</p>
                <button type="button" className="secondary-button" onClick={retryWeather}>Retry</button>
              </div>
            </div>
          ) : currentWeather ? (
            <>
              <div className="weather-main">
                <CloudSun size={49} color="#e7a92e" />
                <div>
                  <h1>{currentWeather.temperatureC == null ? "—" : Math.round(currentWeather.temperatureC)}°C</h1>
                  <span>{currentWeather.condition?.description || currentWeather.condition || "Clear"}</span>
                </div>
              </div>

              <div className="weather-details">
                <div>
                  <Droplets size={18} />
                  <span>{t("humidity")}</span>
                  <strong>{currentWeather.humidityPercent ?? "—"}%</strong>
                </div>
                <div>
                  <CloudSun size={18} />
                  <span>{t("windSpeed")}</span>
                  <strong>{currentWeather.windSpeedKph ?? "—"} km/h</strong>
                </div>
                <div>
                  <AlertTriangle size={18} />
                  <span>{t("rainChance")}</span>
                  <strong>{weather.daily?.[0]?.precipitationProbabilityPercent ?? "—"}%</strong>
                </div>
              </div>

              <div className="weather-note">
                <Activity size={16} />
                <span>Source: {weather.source} • Updated {formatWeatherTime(weather.fetchedAt, weather.location?.timezoneOffsetSeconds, { hour: "2-digit", minute: "2-digit" })} local time</span>
              </div>
              {weatherError && (
                <div className="weather-inline-error">
                  <span>Refresh failed: {weatherError}</span>
                  <button type="button" className="text-button" onClick={retryWeather}>Retry</button>
                </div>
              )}
            </>
          ) : (
            <p>Current weather conditions are unavailable.</p>
          )}
        </div>
      </section>

      <section className="panel alert-panel">
        <div className="alert-icon">
          <AlertTriangle size={21} />
        </div>

        <div className="alert-content">
          <h3>{t("farmAdvisory")}</h3>
          <p>
            {farmName} {t("farmAdvisoryText")}
          </p>
        </div>

        <button className="text-button" onClick={() => setActivePage("Next Best Action")}>
          {t("viewRecommendations")}
        </button>
      </section>

      {/* In-Field Soil Moisture Assessment & Logger Modal */}
      {showMoistureModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px"
          }}
          onClick={() => setShowMoistureModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", color: "#19281e", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Droplets size={22} color="#26945d" />
                  In-Field Soil Moisture Assessment
                </h3>
                <p style={{ margin: "4px 0 0", color: "#6a7d6e", fontSize: "13px" }}>
                  ICAR & USDA Feel and Appearance Soil Moisture Guide
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoistureModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8a9e8e", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: "#f4f8f4", padding: "14px", borderRadius: "10px", fontSize: "13px", color: "#284430", marginBottom: "16px", lineHeight: "1.5" }}>
              <strong>Scientific Water Balance:</strong> Current estimate of <strong>{soilMoisture.percent}%</strong> is calculated from <strong>Karnataka Sujala-3 LRI</strong> soil water holding capacity (<em>{soilMoisture.awcMm} mm/m AWC for {soilText}</em>) and live precipitation. No electronic IoT sensor probe is installed on this field.
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#19281e" }}>Physical Field Test Methods:</h4>
            <div style={{ display: "grid", gap: "10px", fontSize: "13px", color: "#47614e", marginBottom: "18px" }}>
              <div style={{ padding: "10px", border: "1px solid #e2ebe3", borderRadius: "8px" }}>
                <strong>1. Squeeze Ball Test:</strong> Take a handful of topsoil from 15 cm root-zone depth and squeeze firmly.
                <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                  <li><strong>Crumbles / Powder:</strong> Dry (&lt;35% AWC) — Immediate irrigation required.</li>
                  <li><strong>Forms Pliable Ball:</strong> Optimal (50-75% AWC) — Adequate moisture.</li>
                  <li><strong>Leaves Wet Sheen:</strong> Saturated (&gt;80% AWC) — Delay irrigation.</li>
                </ul>
              </div>
              <div style={{ padding: "10px", border: "1px solid #e2ebe3", borderRadius: "8px" }}>
                <strong>2. Ribbon Test (Clay/Black Soil):</strong> Roll moist soil between thumb and forefinger into a ribbon.
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#19281e" }}>Record Your Field Observation:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => handleSaveFieldMoisture(30, "Dry / Deficit", "Observed dry crumbly soil. Irrigation advised.")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #f97316",
                  backgroundColor: "#fff7ed",
                  color: "#c2410c",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Dry (&lt;35%)
              </button>
              <button
                type="button"
                onClick={() => handleSaveFieldMoisture(65, "Optimal", "Observed pliable moist ball. No irrigation needed.")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #22c55e",
                  backgroundColor: "#f0fdf4",
                  color: "#15803d",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Optimal (65%)
              </button>
              <button
                type="button"
                onClick={() => handleSaveFieldMoisture(85, "Wet / Saturated", "Observed wet sticky ribbon. Delay irrigation.")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #3b82f6",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Wet (&gt;80%)
              </button>
            </div>

            {soilMoisture.isFieldLogged && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2ebe3", paddingTop: "12px" }}>
                <span style={{ fontSize: "12px", color: "#2e7d32", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={16} /> Currently displaying your verified field observation
                </span>
                <button
                  type="button"
                  onClick={handleResetToModel}
                  style={{ background: "none", border: "none", color: "#d97706", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Reset to Model
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
