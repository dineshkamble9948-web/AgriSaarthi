
import mongoose from "mongoose";

const agriculturalRecordSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },

    activityType: {
      type: String,
      enum: [
        "Planting",
        "Fertilizer",
        "Irrigation",
        "Pesticide",
        "Harvest",
        "Other",
      ],
      required: true,
    },

    cropName: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      default: "",
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const AgriculturalRecord = mongoose.model(
  "AgriculturalRecord",
  agriculturalRecordSchema
);

export default AgriculturalRecord;
