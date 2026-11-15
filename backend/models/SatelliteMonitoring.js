import mongoose from "mongoose";

const ndviObservationSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    intervalEnd: { type: Date, default: null },
    mean: { type: Number, min: -1, max: 1, required: true },
    validPixelCount: { type: Number, min: 0, default: null }
  },
  { _id: false }
);

const satelliteMonitoringSchema = new mongoose.Schema(
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
    plot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmPlot",
      default: null,
      index: true
    },
    source: { type: String, default: "Sentinel-2 L2A / Copernicus Data Space" },
    areaSource: {
      type: String,
      enum: ["farm-boundary", "plot-boundary", "approximate-location-buffer"],
      required: true
    },
    period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true }
    },
    retrievedAt: { type: Date, required: true },
    latestObservation: { type: Date, required: true },
    latestNDVI: { type: Number, min: -1, max: 1, required: true },
    classification: {
      type: String,
      enum: ["poor", "moderate", "healthy"],
      required: true
    },
    classificationNote: { type: String, required: true },
    imageryStatus: { type: String, enum: ["available", "unavailable"], required: true },
    ndviSeries: { type: [ndviObservationSchema], default: [] }
  },
  { timestamps: true }
);

satelliteMonitoringSchema.index(
  { owner: 1, farm: 1, plot: 1, "period.from": 1, "period.to": 1 },
  { unique: true }
);

const SatelliteMonitoring = mongoose.model("SatelliteMonitoring", satelliteMonitoringSchema);

export default SatelliteMonitoring;
