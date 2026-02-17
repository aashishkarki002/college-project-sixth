/**
 * ElectricityRate — owner-configured rate per property.
 *
 * Industry standard: rates are stored with effective dates so billing is always
 * auditable. You can reconstruct exactly what rate applied to any historical reading.
 *
 * One document per property. Rate history is kept as a sub-array (never deleted).
 * The "active" rate is always the most recent entry in rateHistory.
 */

import mongoose from "mongoose";
import { paisaToRupees, rupeesToPaisa } from "../../utils/moneyUtil.js";

const rateHistoryEntrySchema = new mongoose.Schema(
  {
    // Rate stored as paisa (integer) — same convention as Electricity model
    ratePerUnitPaisa: { type: Number, required: true, min: 1 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null }, // null = currently active
    note: { type: String, default: "" }, // e.g. "NEA tariff revision Q1 2082"
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { _id: true },
);

// Virtual so callers can read in rupees without converting manually
rateHistoryEntrySchema.virtual("ratePerUnit").get(function () {
  return paisaToRupees(this.ratePerUnitPaisa);
});

const electricityRateSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      unique: true, // one rate-config doc per property
      index: true,
    },

    // ── Active rate (denormalised for fast reads) ──
    // Kept in sync with the latest rateHistory entry.
    currentRatePerUnitPaisa: { type: Number, required: true, min: 1 },

    // ── Optional per-meter-type overrides ──
    // If absent, currentRatePerUnitPaisa applies to all meter types.
    //
    // "unit"        → tenant-billed unit readings (residential/commercial)
    // "common_area" → lobbies, corridors, staircases, gym, rooftop
    // "parking"     → basement / surface parking lighting & ventilation
    // "sub_meter"   → any other building equipment (pump, generator, lift)
    meterTypeRates: {
      unit: { type: Number, default: null }, // paisa, null = use default
      common_area: { type: Number, default: null },
      parking: { type: Number, default: null },
      sub_meter: { type: Number, default: null },
    },

    // ── Full rate history (append-only, never update/delete entries) ──
    rateHistory: { type: [rateHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

// Virtual: active rate in rupees
electricityRateSchema.virtual("currentRatePerUnit").get(function () {
  return paisaToRupees(this.currentRatePerUnitPaisa);
});

/**
 * Static: resolve the rate (in paisa) that applies to a given property + meterType.
 * Throws if no rate is configured — never silently defaults.
 *
 * Resolution order:
 *   1. Per-type override (e.g. meterTypeRates.unit, meterTypeRates.common_area)
 *   2. Property default (currentRatePerUnitPaisa)
 */
electricityRateSchema.statics.resolveRate = async function (
  propertyId,
  meterType = "unit",
) {
  const config = await this.findOne({ property: propertyId }).lean();
  if (!config) {
    throw new Error(
      `No electricity rate configured for this property. ` +
        `Please set a rate in Settings → Electricity Rates before recording readings.`,
    );
  }

  // Per-meter-type override takes precedence
  const override = config.meterTypeRates?.[meterType];
  return override ?? config.currentRatePerUnitPaisa;
};

electricityRateSchema.index({ property: 1 });

export const ElectricityRate = mongoose.model(
  "ElectricityRate",
  electricityRateSchema,
);
