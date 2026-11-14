import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function useWeather(location, state) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(Boolean(location));
  const [error, setError] = useState("");
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
          setWeather(response.data.weather);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message
            || "Weather data could not be reached. Check the backend connection and retry."
          );
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

  return { weather, loading, error, retry };
}
