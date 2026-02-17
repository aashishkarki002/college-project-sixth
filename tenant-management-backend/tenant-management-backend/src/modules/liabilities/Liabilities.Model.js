import mongoose from "mongoose";

const liabilitySchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiabilitySource", // similar to RevenueSource
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    payeeType: {
      type: String,
      enum: ["TENANT", "EXTERNAL"], // TENANT if you owe a tenant (like refund), EXTERNAL if vendor/bank
      required: true,
    },

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: function () {
        return this.payeeType === "TENANT";
      },
    },

    referenceType: {
      type: String,
      enum: ["RENT_EXPENSE", "CAM", "SALARY", "MANUAL"  , "SECURITY_DEPOSIT"], // whatever liability types you have
      default: "MANUAL",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return ["RENT_EXPENSE" , "SALARY" , "SECURITY_DEPOSIT"].includes(this.referenceType);
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
  { timestamps: true }
);

export const Liability = mongoose.model("Liability", liabilitySchema);
