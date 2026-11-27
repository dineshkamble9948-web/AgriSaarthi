
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["farmer", "admin"],
      default: "farmer"
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: ""
    },

    preferredLanguage: {
      type: String,
      enum: ["en", "kn"],
      default: "en"
    },

    state: {
      type: String,
      trim: true,
      default: "Karnataka"
    },

    district: {
      type: String,
      trim: true,
      default: ""
    },

    taluk: {
      type: String,
      trim: true,
      default: ""
    },

    village: {
      type: String,
      trim: true,
      default: ""
    },

    city: {
      type: String,
      trim: true,
      default: ""
    },

    pincode: {
      type: String,
      trim: true,
      default: ""
    },

    farmLocation: {
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

    totalLandArea: {
      type: Number,
      min: 0,
      default: 0
    },

    farmingHistory: {
      type: [Object],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
