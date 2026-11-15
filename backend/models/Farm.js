
import mongoose from "mongoose";

const farmSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    farmName: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      default: "Karnataka"
    },

    village: {
      type: String,
      trim: true,
      default: ""
    },

    district: {
      type: String,
      trim: true,
      default: ""
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

    area: {
      type: Number,
      required: true,
      min: 0.01
    },

    areaUnit: {
      type: String,
      enum: ["acres", "hectares"],
      default: "acres"
    },

    soilType: {
      type: String,
      enum: [
        "Alluvial",
        "Black",
        "Red",
        "Laterite",
        "Sandy",
        "Clay",
        "Loamy",
        "Other"
      ],
      default: "Other"
    },

    ph: {
      type: Number,
      min: 0,
      max: 14,
      default: null
    },

    nitrogen: {
      type: Number,
      min: 0,
      default: null
    },

    phosphorus: {
      type: Number,
      min: 0,
      default: null
    },

    potassium: {
      type: Number,
      min: 0,
      default: null
    },

    waterSource: {
      type: String,
      default: "Unknown"
    },

    irrigationType: {
      type: String,
      enum: ["Drip", "Sprinkler", "Flood", "Rainfed", "Other", "Unknown"],
      default: "Unknown"
    }
  },
  {
    timestamps: true
  }
);

farmSchema.index({ owner: 1, createdAt: 1 });

const Farm = mongoose.model("Farm", farmSchema);

export default Farm;
