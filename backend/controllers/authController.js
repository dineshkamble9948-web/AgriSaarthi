import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Farm from "../models/Farm.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  isFallbackMode,
  updateUserLocation,
  getFarmByOwner
} from "../config/fallbackStore.js";
import { reverseGeocode } from "../services/reverseGeocodeService.js";

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "agrisaarthi-dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

export const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isOnlyNumbers = /^[0-9]+$/.test(password);
  const isOnlyAlphabets = /^[A-Za-z]+$/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial && !isOnlyNumbers && !isOnlyAlphabets;
};

let demoUserCreation;

const getDemoUser = async () => {
  if (!demoUserCreation) {
    demoUserCreation = (async () => {
      const email = "demo@agrisaarthi.local";
      const existingUser = isFallbackMode()
        ? findUserByEmail(email)
        : await User.findOne({ email });

      if (existingUser) {
        return existingUser;
      }

      const userData = {
        name: "AgriSaarthi Demo",
        email,
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        state: "Karnataka",
        district: "Bengaluru Urban",
        city: "Bengaluru",
        village: "Ashokanagar",
        pincode: "560001",
        latitude: 12.9716,
        longitude: 77.5946
      };

      if (isFallbackMode()) {
        return createUser(userData);
      }

      try {
        return await User.create(userData);
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        return User.findOne({ email });
      }
    })().finally(() => {
      demoUserCreation = null;
    });
  }

  return demoUserCreation;
};

const isLoopbackRequest = (req) => {
  const address = String(req.socket?.remoteAddress || "").replace(/^::ffff:/, "");
  return address === "127.0.0.1" || address === "::1";
};

export const demoLogin = async (req, res) => {
  if (process.env.NODE_ENV === "production" || !isLoopbackRequest(req)) {
    return res.status(404).json({
      success: false,
      message: "Demo login is unavailable"
    });
  }

  try {
    const user = await getDemoUser();
    const token = generateToken(user._id || user.id);

    return res.status(200).json({
      success: true,
      message: "Demo login successful",
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || "farmer",
        state: user.state || "Karnataka",
        district: user.district || "Bengaluru Urban",
        village: user.village || "",
        city: user.city || "Bengaluru",
        pincode: user.pincode || "560001",
        latitude: user.latitude ?? 12.9716,
        longitude: user.longitude ?? 77.5946
      }
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return res.status(500).json({
      success: false,
      message: "Demo login failed"
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    const cleanName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name must contain between 2 and 80 characters"
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    let existingUser = null;

    if (isFallbackMode()) {
      existingUser = findUserByEmail(normalizedEmail);
    } else {
      existingUser = await User.findOne({ email: normalizedEmail });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    let user;

    if (isFallbackMode()) {
      user = createUser({
        name: cleanName,
        email: normalizedEmail,
        password: hashedPassword
      });
    } else {
      user = await User.create({
        name: cleanName,
        email: normalizedEmail,
        password: hashedPassword
      });
    }

    const token = generateToken(user._id || user.id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || "farmer",
        state: user.state || "",
        district: user.district || "",
        village: user.village || "",
        city: user.city || "",
        pincode: user.pincode || "",
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let user = null;

    if (isFallbackMode()) {
      user = findUserByEmail(normalizedEmail);
    } else {
      user = await User.findOne({ email: normalizedEmail }).select("+password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = generateToken(user._id || user.id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || "farmer",
        state: user.state || "",
        district: user.district || "",
        village: user.village || "",
        city: user.city || "",
        pincode: user.pincode || "",
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || "farmer",
        state: user.state || "",
        district: user.district || "",
        village: user.village || "",
        city: user.city || "",
        pincode: user.pincode || "",
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not fetch profile"
    });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { state, district, village, city, pincode, latitude, longitude } = req.body;

    const lat = latitude !== "" && latitude != null ? Number(latitude) : null;
    const lon = longitude !== "" && longitude != null ? Number(longitude) : null;

    if (
      (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180))
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90, and longitude between -180 and 180."
      });
    }

    const locationPayload = {
      state: String(state || "").trim(),
      district: String(district || "").trim(),
      village: String(village || "").trim(),
      city: String(city || "").trim(),
      pincode: String(pincode || "").trim(),
      latitude: lat,
      longitude: lon
    };

    let updatedUser;
    if (isFallbackMode()) {
      updatedUser = updateUserLocation(req.user._id, locationPayload);
      const farm = getFarmByOwner(req.user._id);
      if (farm) {
        Object.assign(farm, {
          ...locationPayload,
          location: locationPayload.village || locationPayload.city || farm.location
        });
      }
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        locationPayload,
        { new: true, runValidators: true }
      );
      // Synchronize with user's primary farm if one exists
      await Farm.findOneAndUpdate(
        { owner: req.user._id },
        {
          ...locationPayload,
          ...(locationPayload.village || locationPayload.city
            ? { location: locationPayload.village || locationPayload.city }
            : {})
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Your location has been detected and saved successfully!",
      user: {
        id: updatedUser._id || updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || "farmer",
        ...locationPayload
      }
    });
  } catch (error) {
    console.error("Location update error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not save location details."
    });
  }
};

export const reverseGeocodeEndpoint = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Provide both latitude and longitude query parameters."
      });
    }
    const result = await reverseGeocode(latitude, longitude);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
