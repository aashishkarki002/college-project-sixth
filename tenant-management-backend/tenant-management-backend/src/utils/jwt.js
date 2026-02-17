import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

export const generateAccessToken = (payload) => {
  if (!JWT_ACCESS_SECRET) {
    throw new Error(
      "JWT_ACCESS_SECRET is not defined in environment variables"
    );
  }
  if (!payload || !payload.id) {
    throw new Error("Invalid payload: id is required");
  }
  try {
    return jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
};
export const verifyAccessToken = (token) => {
  if (!JWT_ACCESS_SECRET) {
    console.error("JWT_ACCESS_SECRET is not defined in environment variables");
    return null;
  }
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (err) {
    // Token expired, invalid, or malformed
    if (err.name === "TokenExpiredError") {
      console.error("Access token expired");
    } else if (err.name === "JsonWebTokenError") {
      console.error("Invalid access token");
    }
    return null;
  }
};
export const generateRefreshToken = (payload) => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in environment variables"
    );
  }
  if (!payload || !payload.id) {
    throw new Error("Invalid payload: id is required");
  }
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Error generating refresh token:", error);
    throw new Error("Failed to generate refresh token");
  }
};
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};
