
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

    state: {
      type: String,
      trim: true,
      default: ""
    },

    district: {
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
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
