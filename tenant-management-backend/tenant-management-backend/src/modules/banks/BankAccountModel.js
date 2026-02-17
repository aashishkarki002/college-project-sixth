import mongoose from "mongoose";
import { paisaToRupees, formatMoney } from "../../utils/moneyUtil.js";

const bankAccountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    bankName: { type: String, required: true },

    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    balancePaisa: {
      type: Number,
      required: true,
      default: 0,
    },

    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

bankAccountSchema.pre("save", function () {
  // Ensure balance is an integer
  if (!Number.isInteger(this.balancePaisa)) {
    throw new Error(
      `Bank account balance must be integer paisa, got: ${this.balancePaisa}`,
    );
  }
});

bankAccountSchema.index({ accountNumber: 1, isDeleted: 1 });

// ============================================
// VIRTUAL FIELDS (same pattern as rent models)
// ============================================

bankAccountSchema.virtual("balance").get(function () {
  return paisaToRupees(this.balancePaisa ?? 0);
});

bankAccountSchema.virtual("balanceFormatted").get(function () {
  return formatMoney(this.balancePaisa ?? 0);
});

bankAccountSchema.set("toJSON", { virtuals: true, getters: false });
bankAccountSchema.set("toObject", { virtuals: true, getters: false });

export default mongoose.model("BankAccount", bankAccountSchema);
