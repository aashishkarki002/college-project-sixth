import { verifyAccessToken } from "../utils/jwt.js";

export const protect = async (req, res, next) => {
  try {
    // Check if request object is valid
    if (!req) {
      console.error("Request object is null or undefined");
      return res.status(500).json({
        success: false,
        message: "Internal server error - Invalid request",
      });
    }

    let token = null;

    // Method 1: Try to get token from Authorization header
    let authHeader = null;
    if (req.headers && req.headers.authorization) {
      authHeader = req.headers.authorization;
    } else if (req.get && typeof req.get === "function") {
      authHeader = req.get("authorization") || req.get("Authorization");
    } else if (req.header && typeof req.header === "function") {
      authHeader = req.header("authorization") || req.header("Authorization");
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Method 2: Try to get token from cookies (fallback)
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // If still no token found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided. Please login again.",
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid or expired token",
      });
    }

    // Token only contains id and role (as per auth.services.js)
    req.admin = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Protect middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Token verification failed",
    });
  }
};
