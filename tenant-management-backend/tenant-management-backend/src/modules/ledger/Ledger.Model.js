import mongoose from "mongoose";
import { paisaToRupees } from "../../utils/moneyUtil.js";
const ledgerEntrySchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================

    // Debit amount in paisa
    debitAmountPaisa: {
      type: Number,
      default: 0,
      min: 0,
      get: paisaToRupees,
    },

    // Credit amount in paisa
    creditAmountPaisa: {
      type: Number,
      default: 0,
      min: 0,
      get: paisaToRupees,
    },

    // Balance in paisa (running balance after this entry)
    balancePaisa: {
      type: Number,
      default: 0,
      get: paisaToRupees,
    },

    description: {
      type: String,
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    nepaliMonth: {
      type: Number,
      required: true,
    },
    nepaliYear: {
      type: Number,
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);
ledgerEntrySchema.virtual("netAmountPaisa").get(function () {
  return this.debitAmountPaisa - this.creditAmountPaisa;
});

ledgerEntrySchema.virtual("netAmount").get(function () {
  return paisaToRupees(this.netAmountPaisa);
});

// Entry type (debit or credit)
ledgerEntrySchema.virtual("entryType").get(function () {
  if (this.debitAmountPaisa > 0) return "debit";
  if (this.creditAmountPaisa > 0) return "credit";
  return "none";
});
// Ensure either debit or credit is present, not both
ledgerEntrySchema.pre("save", async function () {
  // Use raw PAISA values (bypass getters that convert to rupees)
  const debitAmountPaisaRaw = this.get("debitAmountPaisa", null, {
    getters: false,
  });
  const creditAmountPaisaRaw = this.get("creditAmountPaisa", null, {
    getters: false,
  });

  // Ensure amounts are integers
  if (!Number.isInteger(debitAmountPaisaRaw)) {
    throw new Error(
      `Debit amount must be integer paisa, got: ${debitAmountPaisaRaw}`,
    );
  }
  if (!Number.isInteger(creditAmountPaisaRaw)) {
    throw new Error(
      `Credit amount must be integer paisa, got: ${creditAmountPaisaRaw}`,
    );
  }

  // Validate that either debit or credit is present, but not both
  if (debitAmountPaisaRaw > 0 && creditAmountPaisaRaw > 0) {
    throw new Error("Entry cannot have both debit and credit amounts");
  }
  if (debitAmountPaisaRaw === 0 && creditAmountPaisaRaw === 0) {
    throw new Error("Entry must have either debit or credit amount");
  }
});
ledgerEntrySchema.index({ nepaliMonth: 1, nepaliYear: 1 });
ledgerEntrySchema.index({ transaction: 1, account: 1 });
ledgerEntrySchema.index({ tenant: 1, transactionDate: -1 });
ledgerEntrySchema.index({ property: 1, transactionDate: -1 });
ledgerEntrySchema.index({ transactionDate: -1 });
ledgerEntrySchema.index({ account: 1, transactionDate: -1 });

ledgerEntrySchema.methods.getFormattedEntry = function () {
  // Use raw PAISA values (bypass getters that convert to rupees)
  const debitAmountPaisaRaw = this.get("debitAmountPaisa", null, {
    getters: false,
  });
  const creditAmountPaisaRaw = this.get("creditAmountPaisa", null, {
    getters: false,
  });
  const balancePaisaRaw = this.get("balancePaisa", null, { getters: false });
  const netAmountPaisaRaw = debitAmountPaisaRaw - creditAmountPaisaRaw;

  return {
    id: this._id,
    date: this.transactionDate,
    description: this.description,

    // Paisa values
    paisa: {
      debit: debitAmountPaisaRaw,
      credit: creditAmountPaisaRaw,
      net: netAmountPaisaRaw,
      balance: balancePaisaRaw,
    },

    // Formatted rupee values
    formatted: {
      debit:
        debitAmountPaisaRaw > 0
          ? `Rs. ${paisaToRupees(debitAmountPaisaRaw).toLocaleString()}`
          : "-",
      credit:
        creditAmountPaisaRaw > 0
          ? `Rs. ${paisaToRupees(creditAmountPaisaRaw).toLocaleString()}`
          : "-",
      balance: `Rs. ${paisaToRupees(balancePaisaRaw).toLocaleString()}`,
    },

    entryType: this.entryType,
  };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get entries for a date range
 */
ledgerEntrySchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    transactionDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ transactionDate: 1 });
};

/**
 * Get entries for tenant
 */
ledgerEntrySchema.statics.findByTenant = function (tenantId, options = {}) {
  const query = { tenant: tenantId };

  if (options.startDate) {
    query.transactionDate = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.transactionDate = query.transactionDate || {};
    query.transactionDate.$lte = options.endDate;
  }

  return this.find(query).sort({ transactionDate: 1 });
};

/**
 * Calculate total debits and credits for a period
 */
ledgerEntrySchema.statics.calculateTotals = async function (filters = {}) {
  const pipeline = [];

  // Match stage
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }

  // Group and sum
  pipeline.push({
    $group: {
      _id: null,
      totalDebitPaisa: { $sum: "$debitAmountPaisa" },
      totalCreditPaisa: { $sum: "$creditAmountPaisa" },
      entryCount: { $sum: 1 },
    },
  });

  const result = await this.aggregate(pipeline);

  if (result.length === 0) {
    return {
      paisa: {
        totalDebit: 0,
        totalCredit: 0,
        netAmount: 0,
      },
      rupees: {
        totalDebit: 0,
        totalCredit: 0,
        netAmount: 0,
      },
      entryCount: 0,
    };
  }

  const { totalDebitPaisa, totalCreditPaisa, entryCount } = result[0];
  const netAmountPaisa = totalDebitPaisa - totalCreditPaisa;

  return {
    paisa: {
      totalDebit: totalDebitPaisa,
      totalCredit: totalCreditPaisa,
      netAmount: netAmountPaisa,
    },
    rupees: {
      totalDebit: paisaToRupees(totalDebitPaisa),
      totalCredit: paisaToRupees(totalCreditPaisa),
      netAmount: paisaToRupees(netAmountPaisa),
    },
    entryCount,
  };
};

export const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);
