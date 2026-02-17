/**
 * Electricity.Model.js — updated
 *

 *
 * Billing responsibility (enforced by pre-save):
 *   meterType "unit"        → billTo "tenant",   tenant + unit required
 *   meterType "common_area" → billTo "property",  subMeter required
 *   meterType "parking"     → billTo "property",  subMeter required
 *   meterType "sub_meter"   → billTo "property",  subMeter required
 */

import mongoose from "mongoose";
import {
  paisaToRupees,
  rupeesToPaisa,
  formatMoney,
} from "../../utils/moneyUtil.js";
import { METER_TYPES } from "./SubMeter.Model.js";

// ─── Schema ───────────────────────────────────────────────────────────────────
const electricitySchema = new mongoose.Schema(
  {
    // ── Meter classification ─────────────────────────────────────────────────
    meterType: {
      type: String,
      enum: Object.values(METER_TYPES), // "unit" | "common_area" | "parking" | "sub_meter"
      default: METER_TYPES.UNIT,
      required: true,
      index: true,
    },

    // Who pays this bill — set automatically in pre-save based on meterType.
    // Stored explicitly so queries like "all property-account charges this month"
    // are a single index scan, not a $in on meterType.
    billTo: {
      type: String,
      enum: ["tenant", "property"],
      default: "tenant",
      index: true,
    },

    // ── References (conditional) ──────────────────────────────────────────────
    // Required only when meterType === "unit". Validated in pre-save.
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
      index: true,
    },

    // Required when meterType !== "unit". Validated in pre-save.
    subMeter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubMeter",
      default: null,
      index: true,
    },

    // Always required — every reading belongs to a property.
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property is required"],
      index: true,
    },

    // ── Meter readings ────────────────────────────────────────────────────────
    previousReading: {
      type: Number,
      required: [true, "previousReading is required"],
      min: 0,
    },

    currentReading: {
      type: Number,
      required: [true, "currentReading is required"],
      min: 0,
    },

    // Calculated: currentReading - previousReading. Set in pre-save.
    consumption: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Financial — stored as PAISA (integers) ───────────────────────────────
    //
    // Industry standard: never store money as floating-point.
    // All arithmetic is integer paisa. Rupee values are virtuals (read-only).
    //
    // 1 rupee = 100 paisa.  Rs 12.50 → 1250 paisa.

    ratePerUnitPaisa: {
      type: Number,
      required: [true, "ratePerUnitPaisa is required"],
      min: 1,
      // Source of truth — set by service from ElectricityRate config.
      // Never accepted directly from client.
    },

    totalAmountPaisa: {
      type: Number,
      required: true,
      min: 0,
      // Calculated in pre-save: Math.round(consumption * ratePerUnitPaisa)
    },

    paidAmountPaisa: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Nepali date ───────────────────────────────────────────────────────────
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
      type: String,
      required: true,
      // Human-readable, e.g. "Ashwin 2081"
    },

    // ── English date ──────────────────────────────────────────────────────────
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
    readingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // ── Payment status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue"],
      default: "pending",
      index: true,
    },

    paidDate: {
      type: Date,
      default: null,
    },

    // ── Receipt ───────────────────────────────────────────────────────────────
    receipt: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },

    // ── Tenant transition tracking (unit readings only) ───────────────────────
    isInitialReading: {
      type: Boolean,
      default: false,
      // True for the very first reading on a unit (no previous record exists).
    },
    isTenantTransition: {
      type: Boolean,
      default: false,
      // True when the unit changed tenants since the last reading.
    },
    previousTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    previousRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Electricity",
      default: null,
      // Points to the last reading for this unit/sub-meter.
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "createdBy is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // virtuals included in res.json()
    toObject: { virtuals: true }, // virtuals included in .toObject()
    // Note: .lean() does NOT include virtuals — the service handles
    // paisa→rupees conversion manually for lean queries.
  },
);

// ─── Virtuals (rupee views — READ ONLY) ──────────────────────────────────────
//
// These replace the original type:Number+getter pattern which was broken
// for .lean() queries. Use these when rendering to the frontend.
// In aggregations or .lean() calls, divide paisa fields by 100 directly.

electricitySchema.virtual("ratePerUnit").get(function () {
  return this.ratePerUnitPaisa != null
    ? paisaToRupees(this.ratePerUnitPaisa)
    : null;
});

electricitySchema.virtual("totalAmount").get(function () {
  return this.totalAmountPaisa != null
    ? paisaToRupees(this.totalAmountPaisa)
    : null;
});

electricitySchema.virtual("paidAmount").get(function () {
  return this.paidAmountPaisa != null
    ? paisaToRupees(this.paidAmountPaisa)
    : null;
});

electricitySchema.virtual("remainingAmount").get(function () {
  if (this.totalAmountPaisa == null || this.paidAmountPaisa == null)
    return null;
  return paisaToRupees(
    Math.max(0, this.totalAmountPaisa - this.paidAmountPaisa),
  );
});

// Formatted display strings (same pattern as Rent module)
electricitySchema.virtual("ratePerUnitFormatted").get(function () {
  return this.ratePerUnitPaisa != null
    ? formatMoney(this.ratePerUnitPaisa)
    : null;
});

electricitySchema.virtual("totalAmountFormatted").get(function () {
  return this.totalAmountPaisa != null
    ? formatMoney(this.totalAmountPaisa)
    : null;
});

electricitySchema.virtual("paidAmountFormatted").get(function () {
  return this.paidAmountPaisa != null
    ? formatMoney(this.paidAmountPaisa)
    : null;
});

electricitySchema.virtual("remainingAmountFormatted").get(function () {
  if (this.totalAmountPaisa == null || this.paidAmountPaisa == null)
    return null;
  const remainingPaisa = Math.max(
    0,
    this.totalAmountPaisa - this.paidAmountPaisa,
  );
  return formatMoney(remainingPaisa);
});

// Convenience for frontend display
electricitySchema.virtual("isFullyPaid").get(function () {
  return this.paidAmountPaisa >= this.totalAmountPaisa;
});

electricitySchema.virtual("isSubMeterReading").get(function () {
  return this.meterType !== METER_TYPES.UNIT;
});

// ─── pre-save hook ────────────────────────────────────────────────────────────
electricitySchema.pre("save", async function () {
  // 1. Set billTo based on meterType
  this.billTo = this.meterType === METER_TYPES.UNIT ? "tenant" : "property";

  // 2. Conditional reference validation
  if (this.meterType === METER_TYPES.UNIT) {
    if (!this.tenant)
      throw new Error("tenant is required for meterType 'unit'");
    if (!this.unit) throw new Error("unit is required for meterType 'unit'");
    this.subMeter = null; // ensure no subMeter ref on unit readings
  } else {
    if (!this.subMeter) {
      throw new Error(
        `subMeter is required for meterType '${this.meterType}'. ` +
          `Create a SubMeter document first and pass its _id.`,
      );
    }
    this.tenant = null; // ensure no tenant on sub-meter readings
    this.unit = null;
  }

  // 3. Reading sanity check
  if (this.currentReading < this.previousReading) {
    throw new Error(
      `Current reading (${this.currentReading}) cannot be less than ` +
        `previous reading (${this.previousReading})`,
    );
  }

  // 4. Recalculate consumption (always recompute — never trust caller)
  this.consumption = this.currentReading - this.previousReading;

  // 5. Validate ratePerUnitPaisa is a positive integer
  if (!Number.isInteger(this.ratePerUnitPaisa) || this.ratePerUnitPaisa < 1) {
    throw new Error(
      `ratePerUnitPaisa must be a positive integer (paisa). ` +
        `Got: ${this.ratePerUnitPaisa}. ` +
        `Convert rupees to paisa before saving (e.g. Rs 12.50 → 1250 paisa).`,
    );
  }

  // 6. Recalculate total amount in paisa
  this.totalAmountPaisa = Math.round(this.consumption * this.ratePerUnitPaisa);

  if (!Number.isInteger(this.totalAmountPaisa)) {
    throw new Error(
      `totalAmountPaisa must be an integer. Got: ${this.totalAmountPaisa}`,
    );
  }

  // 7. Validate paidAmountPaisa
  if (!Number.isInteger(this.paidAmountPaisa)) {
    throw new Error(
      `paidAmountPaisa must be an integer. Got: ${this.paidAmountPaisa}`,
    );
  }

  if (this.paidAmountPaisa > this.totalAmountPaisa) {
    throw new Error(
      `Paid amount (Rs ${this.paidAmountPaisa / 100}) exceeds total ` +
        `(Rs ${this.totalAmountPaisa / 100})`,
    );
  }

  // 8. Auto-update payment status based on paisa comparison
  //    Only auto-update if not manually set to "overdue"
  if (this.status !== "overdue") {
    if (
      this.paidAmountPaisa >= this.totalAmountPaisa &&
      this.totalAmountPaisa > 0
    ) {
      this.status = "paid";
    } else if (this.paidAmountPaisa > 0) {
      this.status = "partially_paid";
    }
    // "pending" stays as-is if paidAmountPaisa === 0
  }
});

// ─── Static helpers ───────────────────────────────────────────────────────────

/**
 * Get the last reading for a unit OR sub-meter.
 * Used by the service to auto-fill previousReading on new entries.
 *
 * @param {"unit"|"subMeter"} refType
 * @param {string} refId
 * @param {mongoose.ClientSession} [session]
 */
electricitySchema.statics.getLastReading = async function (
  refType,
  refId,
  session = null,
) {
  const filter = refType === "unit" ? { unit: refId } : { subMeter: refId };
  const query = this.findOne(filter).sort({ readingDate: -1, createdAt: -1 });
  if (session) query.session(session);
  return query.lean();
};

/**
 * Summarise readings for a given query (used by service layer).
 * Returns paisa totals — callers divide by 100 for rupee display.
 *
 * @param {Object} filter  - Mongoose query filter
 * @returns {{ totalAmountPaisa, totalPaidPaisa, totalConsumption, count }}
 */
electricitySchema.statics.summarise = async function (filter) {
  const [result] = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalAmountPaisa: { $sum: "$totalAmountPaisa" },
        totalPaidPaisa: { $sum: "$paidAmountPaisa" },
        totalConsumption: { $sum: "$consumption" },
        count: { $sum: 1 },
      },
    },
  ]);
  return (
    result ?? {
      totalAmountPaisa: 0,
      totalPaidPaisa: 0,
      totalConsumption: 0,
      count: 0,
    }
  );
};

// ─── Indexes ──────────────────────────────────────────────────────────────────
//
// Compound index strategy: most queries filter by property + period,
// then optionally by meterType or billTo.

// Unit reading queries (tenant billing)
electricitySchema.index({ tenant: 1, nepaliYear: -1, nepaliMonth: -1 });
electricitySchema.index({ unit: 1, nepaliYear: -1, nepaliMonth: -1 });

// Sub-meter reading queries (property billing)
electricitySchema.index({ subMeter: 1, nepaliYear: -1, nepaliMonth: -1 });

// Property-level dashboard queries (all readings for a property in a period)
electricitySchema.index({ property: 1, nepaliYear: -1, nepaliMonth: -1 });

// Filter by meterType within a property + period (breakdown bar on dashboard)
electricitySchema.index({
  property: 1,
  meterType: 1,
  nepaliYear: -1,
  nepaliMonth: -1,
});

// Billing target queries (e.g. "all property-account charges this month")
electricitySchema.index({
  property: 1,
  billTo: 1,
  nepaliYear: -1,
  nepaliMonth: -1,
});

// Payment status queries (overdue/pending follow-ups)
electricitySchema.index({ status: 1, readingDate: -1 });
electricitySchema.index({ property: 1, status: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────
export const Electricity = mongoose.model("Electricity", electricitySchema);
