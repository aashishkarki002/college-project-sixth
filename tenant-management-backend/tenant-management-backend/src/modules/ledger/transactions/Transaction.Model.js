import mongoose from "mongoose";
import { paisaToRupees } from "../../../utils/moneyUtil.js";

const transactionSchema = new mongoose.Schema(
  {
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    nepaliDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "RENT_CHARGE",
        "CAM_CHARGE",
        "RENT_PAYMENT_RECEIVED",
        "SECURITY_DEPOSIT",
        "MAINTENANCE_EXPENSE",
        "REVENUE_STREAM",
        "UTILITY_EXPENSE",
        "OTHER_INCOME",
        "OTHER_EXPENSE",
        "ADJUSTMENT",
        "ELECTRICITY_CHARGE",
        "ELECTRICITY_PAYMENT",
        "CAM_PAYMENT_RECEIVED",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "POSTED", "VOIDED"],
      default: "POSTED",
    },
    referenceType: {
      type: String,
      enum: [
        "Rent",
        "Cam",
        "SecurityDeposit",
        "CamPayment",
        "Payment",
        "Maintenance",
        "Revenue",
        "Expense",
        "Adjustment",
        "Electricity",
        "Other",
        "RentPayment",
      ],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "referenceType",
    },
    
    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    totalAmountPaisa: {
      type: Number,
      required: true,
      min: 0,
      get: paisaToRupees,
    },
    
    // Backward compatibility getter
    totalAmount: {
      type: Number,
      get: function () {
        return this.totalAmountPaisa ? paisaToRupees(this.totalAmountPaisa) : 0;
      },
    },
    // Indicates whether the underlying charge is monthly or quarterly.
    // This is especially useful for rent transactions so we can
    // differentiate them easily in reports.
    billingFrequency: {
      type: String,
      enum: ["monthly", "quarterly"],
      default: "monthly",
    },
    // Optional quarter number (1-4) for quarterly transactions.
    // For monthly transactions this will typically be null/undefined.
    quarter: {
      type: Number,
      min: 1,
      max: 4,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    voidedAt: {
      type: Date,
    },
    voidReason: {
      type: String,
    },
  },
  { timestamps: true },
);

transactionSchema.index({ transactionDate: 1, type: 1 });
transactionSchema.index({ referenceType: 1, referenceId: 1 });
transactionSchema.index({ status: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
