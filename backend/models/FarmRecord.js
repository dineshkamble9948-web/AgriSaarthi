
const mongoose = require("mongoose");

const farmRecordSchema = new mongoose.Schema(
  {
    farmer: {
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

    cropName: {
      type: String,
      required: true,
      trim: true,
    },

    variety: {
      type: String,
      trim: true,
      default: "",
    },

    season: {
      type: String,
      enum: ["Kharif", "Rabi", "Zaid", "Other"],
      default: "Other",
    },

    sowingDate: {
      type: Date,
    },

    harvestDate: {
      type: Date,
    },

    area: {
      type: Number,
      min: 0,
      default: 0,
    },

    areaUnit: {
      type: String,
      default: "Acres",
    },

    seedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    fertilizerUsed: [{
      name: String,
      quantity: Number,
      date: Date,
    }],

    irrigationRecords: [{
      date: Date,
      waterQuantity: Number,
      unit: String,
    }],

    harvestQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    harvestUnit: {
      type: String,
      default: "Kg",
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Planned", "Growing", "Harvested"],
      default: "Planned",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FarmRecord", farmRecordSchema);
