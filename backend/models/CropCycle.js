import mongoose from "mongoose";

const cropCycleSchema = new mongoose.Schema(
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
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    cropVariety: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },
    sowingDate: { type: Date, required: true },
    expectedHarvestDate: { type: Date, required: true },
    durationDays: { type: Number, required: true, min: 1 },
    growthStage: {
      type: String,
      enum: [
        "Land Preparation",
        "Sowing",
        "Germination",
        "Vegetative Growth",
        "Flowering",
        "Maturity",
        "Harvesting"
      ],
      default: "Sowing"
    },
    stageUpdatedManually: { type: Boolean, default: false },
    stageUpdatedAt: { type: Date, default: null },
    irrigationMethod: { type: String, trim: true, default: "" },
    actualHarvestDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

cropCycleSchema.index({ owner: 1, farm: 1, sowingDate: -1 });

const CropCycle = mongoose.model("CropCycle", cropCycleSchema);

export default CropCycle;
