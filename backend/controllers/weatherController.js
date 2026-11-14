import { getWeatherForLocation, WeatherProviderError } from "../services/weatherService.js";

export const getWeather = async (req, res) => {
  const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
  const state = typeof req.query.state === "string" ? req.query.state.trim() : "";

  if (!location || location.length > 100 || state.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Provide a farm location of 1 to 100 characters."
    });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "Weather API key is not configured. Add OPENWEATHER_API_KEY to backend/.env and restart the backend."
    });
  }

  try {
    const weather = await getWeatherForLocation(location, state, apiKey);
    return res.status(200).json({ success: true, weather });
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    console.error("Weather request failed:", error);
    return res.status(502).json({
      success: false,
      message: "Weather data is temporarily unavailable. Please retry."
    });
  }
};
