
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  isFallbackMode
} from "../config/fallbackStore.js";

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "agrisaarthi-dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
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
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 12)
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
        email: user.email
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

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
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
        email: user.email
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
        email: user.email
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
    return res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not fetch profile"
    });
  }
};
