import mongoose from "mongoose";

const liabilitySourceSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    }, // Vendor, Salary, Refund, Loan, etc.

    code: { 
      type: String, 
      required: true, 
      unique: true 
    }, // VENDOR, SALARY, REFUND, LOAN

    category: {
      type: String,
      enum: ["OPERATING", "NON_OPERATING"],
      default: "OPERATING", // Operating liabilities like salaries, rent refunds, etc.
    },

    description: { 
      type: String 
    },

    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

export const LiabilitySource = mongoose.model(
  "LiabilitySource",
  liabilitySourceSchema
);
