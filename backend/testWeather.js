import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getWeatherForLocation, getWeatherForCoordinates } from "./services/weatherService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
const location = process.argv[2] || "tokyo";
const state = process.argv[3] || "tokyo";

console.log("=========================================");
console.log("   AgriSaarthi — Weather API Test");
console.log("=========================================");

if (!apiKey) {
  console.error("❌ Error: OPENWEATHER_API_KEY is not set in backend/.env");
  process.exit(1);
}

console.log(`🔑 API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`📍 Testing Location: ${location}, ${state}\n`);

try {
  console.log("⏳ Fetching real-time weather from OpenWeather...");
  const weather = await getWeatherForLocation(location, state, apiKey);

  console.log("\n✅ SUCCESS! Live Weather Data Received:\n");
  console.log(`📌 Location:     ${weather.location.name}, ${weather.location.region} (${weather.location.country})`);
  console.log(`🌐 Coordinates:  Lat ${weather.location.latitude}, Lon ${weather.location.longitude}`);
  console.log(`🌡️  Temperature:  ${weather.current.temperatureC}°C (Feels like: ${weather.current.feelsLikeC}°C)`);
  console.log(`💧 Humidity:     ${weather.current.humidityPercent}%`);
  console.log(`☁️  Condition:    ${weather.current.condition.main} (${weather.current.condition.description})`);
  console.log(`💨 Wind Speed:   ${weather.current.windSpeedKph} km/h`);
  console.log(`🌧️  Rain (1h):    ${weather.current.rainfallLastHourMm} mm`);
  console.log(`🌅 Sunrise:      ${new Date(weather.current.sunriseAt).toLocaleTimeString()}`);
  console.log(`🌇 Sunset:       ${new Date(weather.current.sunsetAt).toLocaleTimeString()}`);

  if (weather.forecast?.daily?.length) {
    console.log("\n📅 5-Day Forecast Outlook:");
    weather.forecast.daily.slice(0, 5).forEach((day, i) => {
      console.log(`   Day ${i + 1} (${day.date}): Min ${day.temperatureMinC}°C / Max ${day.temperatureMaxC}°C | Rain: ${day.precipitationTotalMm}mm | ${day.condition.description}`);
    });
  }

  console.log("\n=========================================");
  console.log("✨ Weather API is fully operational!");
  console.log("=========================================");
} catch (error) {
  console.error("\n❌ Weather API Request Failed:", error.message);
}
