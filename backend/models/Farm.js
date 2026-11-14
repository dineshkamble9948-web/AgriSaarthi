
import mongoose from "mongoose";

const farmSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
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
    }
  },
  {
    timestamps: true
  }
);

const Farm = mongoose.model("Farm", farmSchema);

export default Farm;
