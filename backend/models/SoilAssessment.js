import mongoose from "mongoose";

const parameterSchema = new mongoose.Schema(
  {
    value: { type: Number, default: null },
    unit: { type: String, required: true },
    depth: { type: String, required: true },
    modelled: { type: Boolean, default: true }
  },
  { _id: false }
);

const laboratoryNpkSchema = new mongoose.Schema(
  {
    nitrogen: { type: Number, default: null, min: 0 },
    phosphorus: { type: Number, default: null, min: 0 },
    potassium: { type: Number, default: null, min: 0 },
    unit: { type: String, default: "" },
    status: {
      nitrogen: { type: String, default: "unknown" },
      phosphorus: { type: String, default: "unknown" },
      potassium: { type: String, default: "unknown" }
    }
  },
  { _id: false }
);

const soilAssessmentSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      default: null,
      index: true
    },
    plot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmPlot",
      default: null,
      index: true
    },
    location: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 }
    },
    soilParameters: {
      ph: parameterSchema,
      nitrogen: parameterSchema,
      organicCarbon: parameterSchema,
      clay: parameterSchema,
      sand: parameterSchema,
      silt: parameterSchema,
      cec: parameterSchema
    },
    source: {
      type: String,
      enum: ["SoilGrids", "laboratory-test"],
      required: true
    },
    retrievedAt: { type: Date, default: null },
    selectedCrop: { type: String, default: "" },
    laboratoryNPK: { type: laboratoryNpkSchema, default: null },
    fertilizerRecommendation: { type: mongoose.Schema.Types.Mixed, default: null },
    missingProperties: { type: [String], default: [] }
  },
  { timestamps: true }
);

const SoilAssessment = mongoose.models.SoilAssessment
  || mongoose.model("SoilAssessment", soilAssessmentSchema);

export default SoilAssessment;
