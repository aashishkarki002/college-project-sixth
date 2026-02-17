import mongoose from "mongoose";
import { paisaToRupees } from "../../utils/moneyUtil.js";

const revenueSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RevenueSource",
      required: true,
    },

    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    payerType: {
      type: String,
      enum: ["TENANT", "EXTERNAL"],
      required: true,
    },

    // For tenant payments
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: function () {
        return this.payerType === "TENANT";
      },
    },

    // For external payments
    externalPayer: {
      name: {
        type: String,
        required: function () {
          return this.payerType === "EXTERNAL";
        },
        trim: true,
      },
      type: {
        type: String,
        enum: ["PERSON", "COMPANY"],
        required: function () {
          return this.payerType === "EXTERNAL";
        },
      },
      contact: {
        type: String, // phone / email (optional)
      },
    },

    referenceType: {
      type: String,
      enum: ["RENT", "PARKING", "AD", "CAM", "MANUAL"],
      default: "MANUAL",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return ["RENT", "PARKING", "AD", "CAM"].includes(this.referenceType);
      },
    },

    status: {
      type: String,
      enum: ["RECORDED", "SYNCED"],
      default: "RECORDED",
    },

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

export const Revenue = mongoose.model("Revenue", revenueSchema);
