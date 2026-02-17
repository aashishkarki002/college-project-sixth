import mongoose from "mongoose";
import { paisaToRupees, formatMoney } from "../../utils/moneyUtil.js";

const rentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    innerBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InnerBlock",
      required: true,
    },
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    englishMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    englishYear: {
      type: Number,
      required: true,
    },

    // ============================================
    // BACKWARD COMPATIBILITY FIELDS (computed from paisa)
    // ============================================

    lateFee: {
      type: Number,
      get: function () {
        return this.lateFeePaisa ? paisaToRupees(this.lateFeePaisa) : 0;
      },
    },

    // ============================================
    // PRIMARY FIELDS (stored as INTEGER PAISA)
    // ============================================

    // Rent amount in paisa
    rentAmountPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "rentAmountPaisa must be an integer",
      },
    },

    // Paid amount in paisa
    paidAmountPaisa: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "paidAmountPaisa must be an integer",
      },
    },

    // TDS amount in paisa
    tdsAmountPaisa: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "tdsAmountPaisa must be an integer",
      },
    },

    // Late fee in paisa
    lateFeePaisa: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "lateFeePaisa must be an integer",
      },
    },

    // ============================================
    // STATUS & METADATA
    // ============================================
    status: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue", "cancelled"],
      default: "pending",
    },
    rentFrequency: {
      type: String,
      enum: ["monthly", "quarterly"],
      default: "monthly",
      required: true,
    },
    units: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit",
        required: true,
      },
    ],
    nepaliMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    nepaliYear: {
      type: Number,
      required: true,
    },
    nepaliDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    lateFeeDate: {
      type: Date,
      default: null,
    },
    lateFeeApplied: {
      type: Boolean,
      default: false,
    },
    lateFeeStatus: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue", "cancelled"],
      default: "pending",
    },
    lastPaidDate: {
      type: Date,
      default: null,
    },
    englishDueDate: {
      type: Date,
      required: true,
    },
    nepaliDueDate: {
      type: Date,
      required: true,
    },
    emailReminderSent: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // UNIT BREAKDOWN
    // ============================================
    unitBreakdown: [
      {
        unit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Unit",
          required: true,
        },

        // Financial fields in PAISA
        rentAmountPaisa: {
          type: Number,
          required: true,
          validate: {
            validator: Number.isInteger,
            message: "rentAmountPaisa must be an integer",
          },
        },
        tdsAmountPaisa: {
          type: Number,
          default: 0,
          validate: {
            validator: Number.isInteger,
            message: "tdsAmountPaisa must be an integer",
          },
        },
        paidAmountPaisa: {
          type: Number,
          default: 0,
          validate: {
            validator: Number.isInteger,
            message: "paidAmountPaisa must be an integer",
          },
        },

        // Status for this unit
        status: {
          type: String,
          enum: ["pending", "paid", "partially_paid", "overdue"],
          default: "pending",
        },

        // Lease snapshot at time of rent generation
        pricePerSqft: { type: Number },
        sqft: { type: Number },
        camRate: { type: Number },
      },
    ],

    // Flag to indicate if this uses new unit-based system
    useUnitBreakdown: { type: Boolean, default: false },

    lastPaidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true },
);

// ============================================
// VIRTUAL FIELDS
// ============================================

// Remaining amount (calculated from paisa)
rentSchema.virtual("remainingAmountPaisa").get(function () {
  return this.rentAmountPaisa - this.paidAmountPaisa;
});

rentSchema.virtual("remainingAmount").get(function () {
  return paisaToRupees(this.remainingAmountPaisa);
});

rentSchema.virtual("effectiveRentPaisa").get(function () {
  return this.rentAmountPaisa - this.tdsAmountPaisa;
});

rentSchema.virtual("effectiveRent").get(function () {
  return paisaToRupees(this.effectiveRentPaisa);
});
rentSchema.virtual("rentAmountFormatted").get(function () {
  return formatMoney(this.rentAmountPaisa);
});

rentSchema.virtual("tdsAmountFormatted").get(function () {
  return formatMoney(this.tdsAmountPaisa);
});

rentSchema.virtual("paidAmountFormatted").get(function () {
  return formatMoney(this.paidAmountPaisa);
});

rentSchema.set("toJSON", { virtuals: true, getters: false });
rentSchema.set("toObject", { virtuals: true, getters: false });

// ============================================
// PRE-SAVE HOOK
// ============================================

rentSchema.pre("save", function () {
  // Ensure all paisa values are integers before saving
  if (this.rentAmountPaisa != null && !Number.isInteger(this.rentAmountPaisa)) {
    this.rentAmountPaisa = Math.round(this.rentAmountPaisa);
  }
  if (this.tdsAmountPaisa != null && !Number.isInteger(this.tdsAmountPaisa)) {
    this.tdsAmountPaisa = Math.round(this.tdsAmountPaisa);
  }
  if (this.paidAmountPaisa != null && !Number.isInteger(this.paidAmountPaisa)) {
    this.paidAmountPaisa = Math.round(this.paidAmountPaisa);
  }
  if (this.lateFeePaisa != null && !Number.isInteger(this.lateFeePaisa)) {
    this.lateFeePaisa = Math.round(this.lateFeePaisa);
  }

  // ============================================
  // NEW: Synchronize root level from unit breakdown
  // ============================================
  if (this.useUnitBreakdown && this.unitBreakdown?.length > 0) {
    // Calculate root-level totals from unit breakdown (single source of truth)
    this.rentAmountPaisa = this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.rentAmountPaisa || 0),
      0,
    );

    this.paidAmountPaisa = this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.paidAmountPaisa || 0),
      0,
    );

    this.tdsAmountPaisa = this.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.tdsAmountPaisa || 0),
      0,
    );

    // Update unit statuses
    this.unitBreakdown.forEach((ub) => {
      const effectiveAmountPaisa =
        ub.rentAmountPaisa - (ub.tdsAmountPaisa || 0);

      if (ub.paidAmountPaisa === 0) {
        ub.status = "pending";
      } else if (ub.paidAmountPaisa >= effectiveAmountPaisa) {
        ub.status = "paid";
      } else {
        ub.status = "partially_paid";
      }
    });
  }

  // Update root status based on root totals (now guaranteed accurate)
  if (this.paidAmountPaisa === 0) {
    this.status = "pending";
  } else if (this.paidAmountPaisa >= this.rentAmountPaisa) {
    this.status = "paid";
  } else {
    this.status = "partially_paid";
  }
});

// ============================================
// INDEXES
// ============================================
rentSchema.index(
  { tenant: 1, nepaliMonth: 1, nepaliYear: 1 },
  { unique: true },
);
rentSchema.index({ nepaliDueDate: 1 });
rentSchema.index({ tenant: 1, status: 1 });
rentSchema.index({ englishYear: 1, englishMonth: 1 });
rentSchema.index({ "unitBreakdown.unit": 1 });
rentSchema.index({ useUnitBreakdown: 1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Apply payment to rent (uses paisa internally)
 * @param {number} amountPaisa - Payment amount in paisa
 * @param {Date} paymentDate - Date of payment
 * @param {ObjectId} receivedBy - Admin who received payment
 * @param {Array} unitPayments - Optional per-unit payment breakdown
 */
rentSchema.methods.applyPayment = function (
  amountPaisa,
  paymentDate,
  receivedBy,
  unitPayments = null,
) {
  // Add to total paid amount (in paisa)
  this.paidAmountPaisa += amountPaisa;
  this.lastPaidDate = paymentDate;
  this.lastPaidBy = receivedBy;

  // If unit payments specified and we're using breakdown
  if (unitPayments && this.useUnitBreakdown && this.unitBreakdown?.length > 0) {
    unitPayments.forEach(({ unitId, amountPaisa: unitAmountPaisa }) => {
      const unitEntry = this.unitBreakdown.find(
        (ub) => ub.unit.toString() === unitId.toString(),
      );
      if (unitEntry) {
        unitEntry.paidAmountPaisa += unitAmountPaisa;
      }
    });
  }

  // Status will be updated by pre-save hook
};

/**
 * Get payment status for specific unit
 * @param {ObjectId} unitId - Unit ID
 * @returns {Object|null} Payment status object or null
 */
rentSchema.methods.getUnitPaymentStatus = function (unitId) {
  if (!this.useUnitBreakdown || !this.unitBreakdown?.length) {
    return null;
  }

  const unitEntry = this.unitBreakdown.find(
    (ub) => ub.unit.toString() === unitId.toString(),
  );

  if (!unitEntry) {
    return null;
  }

  const effectiveAmountPaisa =
    unitEntry.rentAmountPaisa - (unitEntry.tdsAmountPaisa || 0);

  return {
    status: unitEntry.status,
    paidAmountPaisa: unitEntry.paidAmountPaisa,
    remainingAmountPaisa: effectiveAmountPaisa - unitEntry.paidAmountPaisa,
    rentAmountPaisa: unitEntry.rentAmountPaisa,
    tdsAmountPaisa: unitEntry.tdsAmountPaisa,

    // Formatted values
    paidAmount: paisaToRupees(unitEntry.paidAmountPaisa),
    remainingAmount: paisaToRupees(
      effectiveAmountPaisa - unitEntry.paidAmountPaisa,
    ),
    rentAmount: paisaToRupees(unitEntry.rentAmountPaisa),
    tdsAmount: paisaToRupees(unitEntry.tdsAmountPaisa),
  };
};

/**
 * Get financial summary
 */
rentSchema.methods.getFinancialSummary = function () {
  return {
    // Paisa values (precise)
    paisa: {
      rentAmount: this.rentAmountPaisa,
      tdsAmount: this.tdsAmountPaisa,
      effectiveRent: this.effectiveRentPaisa,
      paidAmount: this.paidAmountPaisa,
      remainingAmount: this.remainingAmountPaisa,
      lateFee: this.lateFeePaisa || 0,
    },

    // Formatted rupee values (for display)
    formatted: {
      rentAmount: `Rs. ${paisaToRupees(this.rentAmountPaisa).toLocaleString()}`,
      tdsAmount: `Rs. ${paisaToRupees(this.tdsAmountPaisa).toLocaleString()}`,
      effectiveRent: `Rs. ${paisaToRupees(this.effectiveRentPaisa).toLocaleString()}`,
      paidAmount: `Rs. ${paisaToRupees(this.paidAmountPaisa).toLocaleString()}`,
      remainingAmount: `Rs. ${paisaToRupees(this.remainingAmountPaisa).toLocaleString()}`,
      lateFee: `Rs. ${paisaToRupees(this.lateFeePaisa || 0).toLocaleString()}`,
    },

    status: this.status,
    rentFrequency: this.rentFrequency,
  };
};

export const Rent = mongoose.model("Rent", rentSchema);
