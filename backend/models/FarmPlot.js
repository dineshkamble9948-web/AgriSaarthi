import mongoose from "mongoose";

const farmPlotSchema = new mongoose.Schema(
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
    plotName: {
      type: String,
      required: true,
      trim: true
    },
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: undefined
      },
      coordinates: {
        type: [[[Number]]],
        default: undefined
      }
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null
    },
    area: {
      type: Number,
      min: 0.01,
      default: null
    },
    areaUnit: {
      type: String,
      enum: ["acres", "hectares"],
      default: "acres"
    },
    currentCrop: {
      type: String,
      trim: true,
      default: ""
    },
    soilType: {
      type: String,
      default: "Medium Black"
    },
    previousCrops: {
      type: [String],
      default: []
    },
    locationName: {
      type: String,
      trim: true,
      default: ""
    },
    farmingHistory: {
      type: [Object],
      default: []
    },
    irrigationType: {
      type: String,
      enum: ["Drip", "Sprinkler", "Flood", "Rainfed", "Other", "Unknown"],
      default: "Unknown"
    }
  },
  { timestamps: true }
);

farmPlotSchema.index({ owner: 1, farm: 1 });

const FarmPlot = mongoose.model("FarmPlot", farmPlotSchema);

export default FarmPlot;
