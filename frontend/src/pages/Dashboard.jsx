
import {
  Sprout,
  MapPin,
  TrendingUp,
  Droplets,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  CloudSun
} from "lucide-react";

import {
  AreaChart,
  Area,
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

const yieldData = [
  { month: "Jan", yield: 2.2 },
  { month: "Feb", yield: 2.8 },
  { month: "Mar", yield: 2.4 },
  { month: "Apr", yield: 3.1 },
  { month: "May", yield: 3.6 },
  { month: "Jun", yield: 4.2 },
  { month: "Jul", yield: 4.5 }
];

export default function Dashboard({ setActivePage, farm, user }) {
  const { t } = useLanguage();
  const farmName = farm?.farmName || "My Farm";
  const farmLocation = farm?.location || "Farm location";
  const stateName = farm?.state || "Karnataka";
  const areaText = farm?.area ? `${farm.area} ${farm.areaUnit || "acres"}` : "Not set";
  const soilText = farm?.soilType || "Soil profile pending";
  const { weather, loading: weatherLoading, error: weatherError, retry: retryWeather } = useWeather(
    farm?.location,
    farm?.state
  );
  const currentWeather = weather?.current;

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
          trend="Balanced"
        />

        <StatCard
          title={t("expectedYield")}
          value="4.5 Tons"
          subtitle={t("seasonEstimate")}
          icon={TrendingUp}
          color="orange"
          trend="+12%"
        />

        <StatCard
          title={t("soilMoisture")}
          value="65%"
          subtitle={t("sampleFieldReading")}
          icon={Droplets}
          color="purple"
          trend="Normal"
        />
      </section>

      <section className="dashboard-main-grid">
        <div className="panel yield-panel">
          <div className="panel-header">
            <div>
              <h3>{t("farmPerformance")}</h3>
              <p>{t("seasonalYieldTrend")}</p>
            </div>

            <button className="period-button">{t("last7Months")}</button>
          </div>

          <div className="chart-summary">
            <h2>4.5 Tons</h2>
            <span>
              <ArrowUpRight size={15} />
              Sample performance
            </span>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldData}>
                <defs>
                  <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26945d" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#26945d" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eee9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#87928a", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928a", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="yield" stroke="#26945d" strokeWidth={3} fill="url(#yieldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                  <span>{currentWeather.condition.description}</span>
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
                <span>Source: {weather.source} • Updated {formatWeatherTime(weather.fetchedAt, weather.location.timezoneOffsetSeconds, { hour: "2-digit", minute: "2-digit" })} local time</span>
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
    </div>
  );
}
