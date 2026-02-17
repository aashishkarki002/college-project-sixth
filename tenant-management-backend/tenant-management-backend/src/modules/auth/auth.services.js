import Admin from "./admin.Model.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
export const loginUserService = async (email, password) => {
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return { success: false, message: "Admin not found" };
  }

  const isPasswordCorrect = await admin.comparePassword(password);

  if (!isPasswordCorrect) {
    return { success: false, message: "Invalid credentials" };
  }

  if (!admin.isEmailVerified) {
    return { success: false, message: "Please verify your email first" };
  }
  const accessToken = generateAccessToken({ id: admin._id, role: admin.role });
  const refreshToken = generateRefreshToken({
    id: admin._id,
    role: admin.role,
  });
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });

  return { success: true, admin, accessToken, refreshToken };
};

export async function changePasswordService(adminId, oldPassword, newPassword) {
  try {
    const admin = await Admin.findById(adminId).select("+password");

    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    const isPasswordCorrect = await admin.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
      return { success: false, message: "Old password is incorrect" };
    }
    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

    const accessToken = generateAccessToken({
      id: admin._id,
      role: admin.role,
    });
    const refreshToken = generateRefreshToken({
      id: admin._id,
      role: admin.role,
    });
    return {
      success: true,
      message: "Password changed successfully",
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Change password error:", error);
    return {
      success: false,
      message: "Change password failed",
      error: error.message,
    };
  }
}
