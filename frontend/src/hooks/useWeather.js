import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function useWeather(location, state) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(Boolean(location));
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const retry = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const farmLocation = typeof location === "string" ? location.trim() : "";
    if (!farmLocation) {
      return undefined;
    }

    let active = true;
    const loadWeather = async (showLoading) => {
      if (showLoading) {
        setLoading(true);
      }
      setError("");

      try {
        const response = await api.get("/weather", {
          params: {
            location: farmLocation,
            ...(state ? { state } : {})
          }
        });
        if (active) {
          const freshWeather = response.data.weather;
          setWeather(freshWeather);
          setIsOffline(false);
          try {
            localStorage.setItem(
              "agrisaarthi_cached_weather",
              JSON.stringify({ weather: freshWeather, timestamp: new Date().toISOString() })
            );
          } catch (e) {
            // ignore storage quota errors
          }
        }
      } catch (requestError) {
        if (active) {
          // NFR12: Attempt to load from offline cache during connectivity interruptions
          const cached = localStorage.getItem("agrisaarthi_cached_weather");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setWeather(parsed.weather);
              setIsOffline(true);
              setError("Offline mode: displaying last cached weather forecast.");
            } catch (e) {
              setError(
                requestError.response?.data?.message
                || "Weather data could not be reached. Check the backend connection and retry."
              );
            }
          } else {
            setError(
              requestError.response?.data?.message
              || "Weather data could not be reached. Check the backend connection and retry."
            );
          }
        }
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    };

    loadWeather(true);
    const intervalId = window.setInterval(
      () => loadWeather(false),
      REFRESH_INTERVAL_MS
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [location, state, refreshKey]);

  return { weather, loading, error, isOffline, retry };
}
