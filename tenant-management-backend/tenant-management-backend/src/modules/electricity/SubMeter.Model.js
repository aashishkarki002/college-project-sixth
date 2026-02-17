/**
 * SubMeter.Model.js
 *
 * Represents a physical sub-meter installed for shared infrastructure —
 * common areas, parking, or any building-wide equipment.
 *
 * A SubMeter is an entity (the meter itself), NOT a reading.
 * Readings are stored in the Electricity model with meterType ≠ "unit"
 * and a reference back to this document via the `subMeter` field.
 *
 * Industry pattern (Schneider EcoStruxure, Siemens BMS):
 *   Main meter  →  property account
 *   Sub-meters  →  individual cost centres (lobby, parking, lift, etc.)
 *   Unit meters →  tenant accounts
 *
 * Billing responsibility:
 *   Sub-meter consumption is billed to the property / HOA, never to a
 *   specific tenant. The Electricity model enforces this: when meterType
 *   is not "unit", the `tenant` and `unit` fields are null.
 */

import mongoose from "mongoose";

// ─── Meter type enum (shared with Electricity model) ─────────────────────────
export const METER_TYPES = {
  UNIT: "unit", // residential / commercial unit — tenant billed
  COMMON_AREA: "common_area", // lobbies, corridors, staircases, gym, rooftop
  PARKING: "parking", // basement / surface parking lighting & ventilation
  SUB_METER: "sub_meter", // any other building equipment (pump, generator, lift)
};

// ─── Schema ───────────────────────────────────────────────────────────────────
const subMeterSchema = new mongoose.Schema(
  {
    // ── Identification ───────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Meter name is required"],
      trim: true,
      // e.g. "Block A – Main Lobby", "Parking Level B1", "Rooftop Garden"
    },

    // Meter type — determines billing responsibility and display grouping
    meterType: {
      type: String,
      enum: [
        METER_TYPES.COMMON_AREA,
        METER_TYPES.PARKING,
        METER_TYPES.SUB_METER,
      ],
      required: [true, "meterType is required"],
      // NOTE: "unit" is intentionally excluded — unit meters are just Unit docs,
      // not SubMeter docs. This prevents ambiguity.
    },

    // Optional short description for the owner's dashboard
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Location ─────────────────────────────────────────────────────────────
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property is required"],
      index: true,
    },

    // Optional — meter may span the whole property (e.g. main pump)
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      default: null,
    },

    // Optional — narrows further to a wing / floor / inner block
    innerBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InnerBlock",
      default: null,
    },

    // Human-readable location tag for display (e.g. "Block A", "All Blocks")
    locationLabel: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Physical meter details ────────────────────────────────────────────────
    // Serial number printed on the physical meter
    meterSerialNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // Meter installation date — useful for first-reading validation
    installedOn: {
      type: Date,
      default: null,
    },

    // ── State ────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      // Set to false to retire a meter without deleting its reading history
    },

    // Last recorded reading — denormalised for fast display on dashboards
    // Updated automatically by the Electricity pre-save hook (see below)
    lastReading: {
      value: { type: Number, default: null },
      readingDate: { type: Date, default: null },
      recordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Electricity",
        default: null,
      },
    },

    // ── Audit ─────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Convenience: full display name including type label
subMeterSchema.virtual("displayName").get(function () {
  const typeLabel =
    {
      common_area: "Common Area",
      parking: "Parking",
      sub_meter: "Sub-Meter",
    }[this.meterType] ?? this.meterType;
  return `[${typeLabel}] ${this.name}`;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
subMeterSchema.index({ property: 1, meterType: 1 });
subMeterSchema.index({ property: 1, block: 1 });
subMeterSchema.index({ property: 1, isActive: 1, meterType: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────
export const SubMeter = mongoose.model("SubMeter", subMeterSchema);
