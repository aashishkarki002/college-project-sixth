import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function (req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}
