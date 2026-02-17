// RevenueSource.Model.js
import mongoose from "mongoose";

const revenueSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Rent, Parking, Ads
    code: { type: String, required: true, unique: true }, // RENT, PARKING
    category: {
      type: String,
      enum: ["OPERATING", "NON_OPERATING"],
      default: "OPERATING",
    },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const RevenueSource = mongoose.model(
  "RevenueSource",
  revenueSourceSchema
);

