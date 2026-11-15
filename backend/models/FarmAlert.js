import mongoose from "mongoose";

const farmAlertSchema = new mongoose.Schema(
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
      default: null
    },
    type: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["info", "caution", "warning", "critical"],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    sourceReference: { type: String, required: true, trim: true },
    observedAt: { type: Date, required: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: null },
    active: { type: Boolean, default: true, index: true },
    acknowledgedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

farmAlertSchema.index(
  { owner: 1, farm: 1, type: 1, sourceReference: 1 },
  { unique: true }
);

const FarmAlert = mongoose.models.FarmAlert || mongoose.model("FarmAlert", farmAlertSchema);

export default FarmAlert;
