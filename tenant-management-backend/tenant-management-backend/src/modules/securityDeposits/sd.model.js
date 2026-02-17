import mongoose from "mongoose";
import { paisaToRupees, formatMoney } from "../../utils/moneyUtil.js";

const sdSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      required: true,
    },
    innerBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InnerBlock",
      required: true,
    },

    month: { type: Number, required: true, min: 1, max: 12 },
    nepaliMonth: { type: Number, required: true, min: 1, max: 12 },
    nepaliYear: { type: Number, required: true },
    nepaliDate: { type: Date, required: true },
    year: { type: Number, required: true },

    // ============================================
    // PRIMARY FIELD - STORED AS PAISA (INTEGER)
    // ============================================
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "amountPaisa must be an integer",
      },
    },

    mode: {
      type: String,
      enum: ["cash", "cheque", "bank_transfer", "bank_guarantee"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "held_as_bg",
        "refunded",
        "adjusted",
        "partially_refunded",
      ],
      default: "pending",
    },

    paidDate: { type: Date, default: null },

    // ============================================
    // NEW: UNIT BREAKDOWN STRUCTURE
    // ============================================
    unitBreakdown: [
      {
        unit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Unit",
          required: true,
        },

        // Financial fields in PAISA
        amountPaisa: {
          type: Number,
          required: true,
          validate: {
            validator: Number.isInteger,
            message: "unit amountPaisa must be an integer",
          },
        },

        refundedAmountPaisa: {
          type: Number,
          default: 0,
          validate: {
            validator: Number.isInteger,
            message: "refundedAmountPaisa must be an integer",
          },
        },

        adjustedAmountPaisa: {
          type: Number,
          default: 0,
          validate: {
            validator: Number.isInteger,
            message: "adjustedAmountPaisa must be an integer",
          },
        },

        // Status for this unit's SD
        status: {
          type: String,
          enum: [
            "pending",
            "paid",
            "held_as_bg",
            "refunded",
            "adjusted",
            "partially_refunded",
          ],
          default: "pending",
        },

        // Payment details per unit
        paidDate: { type: Date, default: null },
        refundDate: { type: Date, default: null },

        // Lease snapshot (for reference)
        sqft: { type: Number },
        pricePerSqft: { type: Number },
        monthsOfSecurity: { type: Number, default: 3 }, // Usually 3 months
      },
    ],

    // Flag to indicate multi-unit breakdown is used
    useUnitBreakdown: { type: Boolean, default: false },

    // ============================================
    // PAYMENT DETAILS (existing fields)
    // ============================================
    chequeDetails: {
      chequeNumber: { type: String },
      chequeDate: { type: Date },
      bankName: { type: String },
    },

    bankGuaranteeDetails: {
      bgNumber: { type: String },
      bankName: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
    },

    documents: [
      {
        type: {
          type: String,
          enum: ["cheque", "bank_guarantee", "refund_receipt"],
          required: true,
        },
        files: [
          {
            url: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    notes: { type: String, default: "" },

    // Track refunds
    refundHistory: [
      {
        amountPaisa: { type: Number, required: true },
        refundDate: { type: Date, required: true },
        refundedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          required: true,
        },
        reason: { type: String },
        unitId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Unit",
        },
        mode: {
          type: String,
          enum: ["cash", "bank_transfer", "cheque"],
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

// ============================================
// VIRTUAL FIELDS
// ============================================

sdSchema.virtual("totalRefundedPaisa").get(function () {
  if (this.useUnitBreakdown && this.unitBreakdown?.length) {
    return this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.refundedAmountPaisa || 0),
      0,
    );
  }
  return this.refundHistory.reduce(
    (sum, refund) => sum + (refund.amountPaisa || 0),
    0,
  );
});

sdSchema.virtual("totalAdjustedPaisa").get(function () {
  if (this.useUnitBreakdown && this.unitBreakdown?.length) {
    return this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.adjustedAmountPaisa || 0),
      0,
    );
  }
  return 0;
});

sdSchema.virtual("remainingAmountPaisa").get(function () {
  return this.amountPaisa - this.totalRefundedPaisa - this.totalAdjustedPaisa;
});

sdSchema.virtual("remainingAmount").get(function () {
  return paisaToRupees(this.remainingAmountPaisa);
});

sdSchema.virtual("amountFormatted").get(function () {
  return formatMoney(this.amountPaisa);
});

sdSchema.set("toJSON", { virtuals: true, getters: false });
sdSchema.set("toObject", { virtuals: true, getters: false });

// ============================================
// PRE-SAVE HOOK
// ============================================

sdSchema.pre("save", function () {
  // Ensure amount is an integer
  if (this.amountPaisa && !Number.isInteger(this.amountPaisa)) {
    this.amountPaisa = Math.round(this.amountPaisa);
  }

  // ============================================
  // NEW: Synchronize root level from unit breakdown
  // ============================================
  if (this.useUnitBreakdown && this.unitBreakdown?.length > 0) {
    // Calculate root-level total from unit breakdown
    this.amountPaisa = this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.amountPaisa || 0),
      0,
    );

    // Update unit statuses based on refunds/adjustments
    this.unitBreakdown.forEach((ub) => {
      const totalDeducted =
        (ub.refundedAmountPaisa || 0) + (ub.adjustedAmountPaisa || 0);

      if (totalDeducted === 0) {
        // No refunds/adjustments
        if (ub.paidDate) {
          ub.status = this.mode === "bank_guarantee" ? "held_as_bg" : "paid";
        } else {
          ub.status = "pending";
        }
      } else if (totalDeducted >= ub.amountPaisa) {
        // Fully refunded/adjusted
        ub.status = ub.refundedAmountPaisa > 0 ? "refunded" : "adjusted";
      } else {
        // Partially refunded/adjusted
        ub.status = "partially_refunded";
      }
    });

    // Update root status
    const totalRefunded = this.totalRefundedPaisa;
    const totalAdjusted = this.totalAdjustedPaisa;
    const totalDeducted = totalRefunded + totalAdjusted;

    if (totalDeducted === 0) {
      this.status = this.mode === "bank_guarantee" ? "held_as_bg" : "paid";
    } else if (totalDeducted >= this.amountPaisa) {
      this.status = totalRefunded > 0 ? "refunded" : "adjusted";
    } else {
      this.status = "partially_refunded";
    }
  }
});

// ============================================
// INDEXES
// ============================================
sdSchema.index({ tenant: 1, nepaliMonth: 1, nepaliYear: 1 }, { unique: true });
sdSchema.index({ tenant: 1, status: 1 });
sdSchema.index({ property: 1, status: 1 });
sdSchema.index({ "unitBreakdown.unit": 1 });
sdSchema.index({ useUnitBreakdown: 1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Apply refund to SD (per-unit or aggregate)
 * @param {number} amountPaisa - Refund amount in paisa
 * @param {Date} refundDate - Date of refund
 * @param {ObjectId} refundedBy - Admin who processed refund
 * @param {Array} unitRefunds - Optional per-unit refund breakdown
 * @param {string} reason - Reason for refund
 * @param {string} mode - Refund mode (cash, bank_transfer, cheque)
 */
sdSchema.methods.applyRefund = function (
  amountPaisa,
  refundDate,
  refundedBy,
  unitRefunds = null,
  reason = "",
  mode = "bank_transfer",
) {
  if (!Number.isInteger(amountPaisa)) {
    throw new Error(`Refund amount must be integer paisa, got: ${amountPaisa}`);
  }

  if (amountPaisa > this.remainingAmountPaisa) {
    throw new Error(
      `Refund amount (${paisaToRupees(amountPaisa)} Rs) exceeds remaining SD (${paisaToRupees(this.remainingAmountPaisa)} Rs)`,
    );
  }

  // If unit refunds specified and we're using breakdown
  if (unitRefunds && this.useUnitBreakdown && this.unitBreakdown?.length > 0) {
    // Validate unit refunds sum equals total
    const unitRefundsSum = unitRefunds.reduce((sum, ur) => {
      if (!Number.isInteger(ur.amountPaisa)) {
        throw new Error(
          `Unit refund must be integer paisa, got: ${ur.amountPaisa}`,
        );
      }
      return sum + ur.amountPaisa;
    }, 0);

    if (unitRefundsSum !== amountPaisa) {
      throw new Error(
        `Unit refunds sum (${unitRefundsSum} paisa) does not match total (${amountPaisa} paisa)`,
      );
    }

    // Apply refund to each unit
    unitRefunds.forEach(({ unitId, amountPaisa: unitAmountPaisa }) => {
      const unitEntry = this.unitBreakdown.find(
        (ub) => ub.unit.toString() === unitId.toString(),
      );

      if (!unitEntry) {
        throw new Error(`Unit ${unitId} not found in breakdown`);
      }

      unitEntry.refundedAmountPaisa += unitAmountPaisa;
      unitEntry.refundDate = refundDate;

      // Add to refund history
      this.refundHistory.push({
        amountPaisa: unitAmountPaisa,
        refundDate,
        refundedBy,
        reason,
        unitId,
        mode,
      });
    });
  } else {
    // Legacy refund (no unit breakdown)
    this.refundHistory.push({
      amountPaisa,
      refundDate,
      refundedBy,
      reason,
      mode,
    });
  }

  // Status will be updated by pre-save hook
};

/**
 * Get refund status for specific unit
 * @param {ObjectId} unitId - Unit ID
 * @returns {Object|null} Refund status object or null
 */
sdSchema.methods.getUnitRefundStatus = function (unitId) {
  if (!this.useUnitBreakdown || !this.unitBreakdown?.length) {
    return null;
  }

  const unitEntry = this.unitBreakdown.find(
    (ub) => ub.unit.toString() === unitId.toString(),
  );

  if (!unitEntry) {
    return null;
  }

  const remainingPaisa =
    unitEntry.amountPaisa -
    (unitEntry.refundedAmountPaisa || 0) -
    (unitEntry.adjustedAmountPaisa || 0);

  return {
    status: unitEntry.status,
    amountPaisa: unitEntry.amountPaisa,
    refundedAmountPaisa: unitEntry.refundedAmountPaisa || 0,
    adjustedAmountPaisa: unitEntry.adjustedAmountPaisa || 0,
    remainingAmountPaisa: remainingPaisa,

    // Formatted values
    amount: paisaToRupees(unitEntry.amountPaisa),
    refundedAmount: paisaToRupees(unitEntry.refundedAmountPaisa || 0),
    adjustedAmount: paisaToRupees(unitEntry.adjustedAmountPaisa || 0),
    remainingAmount: paisaToRupees(remainingPaisa),

    paidDate: unitEntry.paidDate,
    refundDate: unitEntry.refundDate,
  };
};

/**
 * Get financial summary
 */
sdSchema.methods.getFinancialSummary = function () {
  return {
    // Paisa values (precise)
    paisa: {
      total: this.amountPaisa,
      refunded: this.totalRefundedPaisa,
      adjusted: this.totalAdjustedPaisa,
      remaining: this.remainingAmountPaisa,
    },

    // Formatted rupee values (for display)
    formatted: {
      total: `Rs. ${paisaToRupees(this.amountPaisa).toLocaleString()}`,
      refunded: `Rs. ${paisaToRupees(this.totalRefundedPaisa).toLocaleString()}`,
      adjusted: `Rs. ${paisaToRupees(this.totalAdjustedPaisa).toLocaleString()}`,
      remaining: `Rs. ${paisaToRupees(this.remainingAmountPaisa).toLocaleString()}`,
    },

    status: this.status,
    mode: this.mode,
    unitCount: this.useUnitBreakdown ? this.unitBreakdown.length : 1,
  };
};

export const Sd = mongoose.model("Sd", sdSchema);
