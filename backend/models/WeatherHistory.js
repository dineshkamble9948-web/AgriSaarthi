import mongoose from "mongoose";

const weatherHistorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true
    },
    latitude: { type: Number, min: -90, max: 90, required: true },
    longitude: { type: Number, min: -180, max: 180, required: true },
    source: { type: String, default: "OpenWeather" },
    sourceFetchedAt: { type: Date, required: true },
    weather: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

weatherHistorySchema.index(
  { owner: 1, farm: 1, sourceFetchedAt: 1 },
  { unique: true }
);

const WeatherHistory = mongoose.model("WeatherHistory", weatherHistorySchema);

export default WeatherHistory;
