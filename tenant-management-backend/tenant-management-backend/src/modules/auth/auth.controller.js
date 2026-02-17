import Admin from "./admin.Model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loginUserService } from "./auth.services.js";
import { sendEmail } from "../../config/nodemailer.js";
import { changePasswordService } from "./auth.services.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import dotenv from "dotenv";
import generateEmailVerificationToken from "../../utils/token.js";
dotenv.config();

export const registerUser = async (req, res) => {
  try {
    console.log("Registration request received:", {
      body: req.body,
      headers: req.headers["content-type"],
    });

    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      console.log("Missing required fields:", {
        name,
        email,
        password: !!password,
        phone,
      });
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, password, phone) are required",
      });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const { rawToken, hashedToken, expires } = generateEmailVerificationToken();

    const newUser = await Admin.create({
      name,
      email,
      password,
      phone,
      role: "admin",
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiresAt: expires,
      isEmailVerified: false,
    });

    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
        <h2>Verify your email</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Account created. Please verify your email.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "User creation failed" });
  }
};

/** Same as register but for staff: creates user with role "staff" and sends verification email. Protected - admin only. */
export const registerStaff = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, password, phone) are required",
      });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const { rawToken, hashedToken, expires } = generateEmailVerificationToken();

    await Admin.create({
      name,
      email,
      password,
      phone,
      role: role || "staff",
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiresAt: expires,
      isEmailVerified: false,
    });

    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
        <h2>Verify your email</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Staff account created. Verification link sent to their email.",
    });
  } catch (error) {
    console.error("Register staff error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Staff creation failed" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Verification token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await Admin.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    if (user.isEmailVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Email already verified" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await user.save();

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?success=Email verified successfully. Please login.`
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Email verification failed" });
  }
};
export const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Admin.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    if (user.isEmailVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Email already verified" });
    }
    const { rawToken, hashedToken, expires } = generateEmailVerificationToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiresAt = expires;
    await user.save();
    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${rawToken}`;
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link expires in 10 minutes.</p>
    `,
    });
    return res
      .status(200)
      .json({ success: true, message: "Email verification link sent" });
  } catch (error) {
    console.error("Resend email verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Email verification failed" });
  }
};
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const result = await loginUserService(email, password);

    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message });
    }

    // Validate that tokens were generated
    if (!result.accessToken) {
      console.error("Access token not generated in login service");
      return res.status(500).json({
        success: false,
        message: "Failed to generate access token",
      });
    }

    if (!result.refreshToken) {
      console.error("Refresh token not generated in login service");
      return res.status(500).json({
        success: false,
        message: "Failed to generate refresh token",
      });
    }

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    // Set access token as httpOnly cookie (for protected routes)
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes (matches token expiry)
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: result.admin._id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
        phone: result.admin.phone,
        address: result.admin.address,
      },
      token: result.accessToken, // Also return in response for clients that prefer headers
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};
export const changePassword = async (req, res) => {
  try {
    const adminId = req.admin?.id;

    if (!adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Admin ID is required" });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old password",
      });
    }
    const result = await changePasswordService(
      adminId,
      oldPassword,
      newPassword
    );
    // Set new refresh token
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    // Set new access token
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/",
    });

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Change password error:", error);
    throw new Error("Change password failed");
  }
};
export const logoutUser = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Admin ID is required" });
    }
    // Clear both tokens
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh-token",
    });
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Synchronous verify
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const admin = await Admin.findById(decoded.id).select("+password");
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    }

    const newAccessToken = generateAccessToken({
      id: admin._id,
      role: admin.role,
    });
    const newRefreshToken = generateRefreshToken({
      id: admin._id,
      role: admin.role,
    });

    // Set new refresh token
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    // Set new access token
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/",
    });

    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
      },
      token: newAccessToken, // Also return in response for clients that prefer headers
      message: "Token refreshed",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export const getMe = async (req, res) => {
  try {
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isEmailVerified: admin.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      message: "Get me failed",
    });
  }
};
export const updateAdmin = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const { name, email, phone, address, company } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email, phone, address, company },
      { new: true }
    );
    return res
      .status(200)
      .json({ success: true, message: "Admin updated successfully", admin });
  } catch (error) {
    console.error("Update admin error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Update admin failed" });
  }
};
