import mongoose from "mongoose";
import { paisaToRupees } from "../../../utils/moneyUtil.js";

const accountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["ASSET", "LIABILITY", "REVENUE", "EXPENSE", "EQUITY"],
      required: true,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    
    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    currentBalancePaisa: {
      type: Number,
      default: 0,
      get: paisaToRupees,
    },
    
    // Backward compatibility getter
    currentBalance: {
      type: Number,
      get: function () {
        return this.currentBalancePaisa ? paisaToRupees(this.currentBalancePaisa) : 0;
      },
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Note: code field already has unique: true which creates an index
accountSchema.index({ type: 1, isActive: 1 });

export const Account = mongoose.model("Account", accountSchema);
