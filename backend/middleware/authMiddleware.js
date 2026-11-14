
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isFallbackMode, findUserById } from "../config/fallbackStore.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;

    if (isFallbackMode()) {
      user = findUserById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists"
      });
    }

    req.user = {
      _id: user._id || user.id,
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role || "farmer"
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

export default protect;
