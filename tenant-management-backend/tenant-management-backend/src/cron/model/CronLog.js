// models/CronLog.js
import mongoose from "mongoose";

const cronLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  ranAt: { type: Date, default: Date.now },
  message: String,
  count: Number,
  success: Boolean,
  error: String,
});

export const CronLog = mongoose.model("CronLog", cronLogSchema);
