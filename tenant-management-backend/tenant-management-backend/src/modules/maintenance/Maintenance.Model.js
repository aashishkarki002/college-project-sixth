import mongoose from "mongoose";
import { paisaToRupees } from "../../utils/moneyUtil.js";

const maintenanceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["Repair", "Maintenance", "Inspection", "Other"],
      default: "Maintenance",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "OPEN",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    amountPaisa: {
      type: Number,
      default: 0,
      min: 0,
      get: paisaToRupees,
    },
    paidAmountPaisa: {
      type: Number,
      default: 0,
      min: 0,
      get: paisaToRupees,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partially_paid", "paid"],
      default: "pending",
    },
    lastPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    attachments: [{ filename: String, url: String, mimetype: String }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    completedAt: Date,
    completionNotes: String,
    recurring: { type: Boolean, default: false },
    recurringIntervalDays: Number,
  },
  { timestamps: true },
);

// Helpful indexes for querying maintenance tasks
maintenanceSchema.index({ status: 1, priority: 1, scheduledDate: -1 });
maintenanceSchema.index({ tenant: 1 });
maintenanceSchema.index({ property: 1, unit: 1 });

maintenanceSchema.pre("save", function () {
  // Ensure amounts are integers
  if (this.amountPaisa && !Number.isInteger(this.amountPaisa)) {
    throw new Error(
      `Maintenance amount must be integer paisa, got: ${this.amountPaisa}`,
    );
  }
  if (this.paidAmountPaisa && !Number.isInteger(this.paidAmountPaisa)) {
    throw new Error(
      `Paid amount must be integer paisa, got: ${this.paidAmountPaisa}`,
    );
  }

  // Validate paid amount doesn't exceed amount (in paisa)
  if (this.paidAmountPaisa > this.amountPaisa) {
    throw new Error("Paid amount cannot exceed maintenance amount");
  }
});

export const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
