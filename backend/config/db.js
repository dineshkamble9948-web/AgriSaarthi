
import mongoose from "mongoose";
import { setFallbackMode } from "./fallbackStore.js";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MongoDB connection string not configured. Running in local fallback mode.");
    setFallbackMode(true);
    return false;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    setFallbackMode(false);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return true;
  } catch (error) {
    console.warn("MongoDB connection failed. Falling back to local in-memory storage.");
    console.warn(error.message);
    setFallbackMode(true);
    return false;
  }
};

export default connectDB;
