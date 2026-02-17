import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
const adminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "staff", "super_admin"],
    default: "staff",
  },
  phone: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationTokenExpiresAt: { type: Date, default: null },
  refreshToken: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  passwordChangedAt: { type: Date, default: null, timestamps: true },
});

adminSchema.pre("save", async function () {
  const admin = this;

  if (!admin.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  admin.password = await bcrypt.hash(admin.password, salt);
});

// Method to compare password
adminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("Admin", adminSchema);
