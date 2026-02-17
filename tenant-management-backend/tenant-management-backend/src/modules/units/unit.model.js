import mongoose from "mongoose";
import { calculateUnitLease } from "../tenant/domain/rent.calculator.service.js";

const unitSchema = new mongoose.Schema(
  {
    // ============================================
    // BASIC INFO
    // ============================================
    name: { type: String, required: true },

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

    // ============================================
    // CURRENT LEASE (SINGLE SOURCE OF TRUTH)
    // ============================================
    currentLease: {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
      },

      leaseSquareFeet: { type: Number, default: 0 },

      pricePerSqft: { type: Number, default: 0 },
      camRatePerSqft: { type: Number, default: 0 },

      tdsPercentage: { type: Number, default: 10 },
      tds: { type: Number, default: 0 },

      monthlyRent: { type: Number, default: 0 },
      monthlyCam: { type: Number, default: 0 },
      totalMonthly: { type: Number, default: 0 },

      // null allowed for bank guarantee (no cash deposit)
      securityDeposit: {
        type: Number,
        default: 0,
        set: (v) => {
          if (v == null) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        },
      },
      securityDepositStatus: {
        type: String,
        enum: ["held", "partially_refunded", "fully_refunded"],
        default: "held",
      },

      leaseStartDate: { type: Date },
      leaseEndDate: {
        type: Date,
        validate: {
          validator(value) {
            if (!this.leaseStartDate) return true;
            return value > this.leaseStartDate;
          },
          message: "Lease end date must be after lease start date",
        },
      },

      dateOfAgreementSigned: Date,
      keyHandoverDate: Date,
      spaceHandoverDate: Date,

      status: {
        type: String,
        enum: ["active", "notice_period", "expired"],
        default: "active",
      },

      notes: String,
    },

    isOccupied: { type: Boolean, default: false },

    // ============================================
    // OCCUPANCY HISTORY (IMMUTABLE)
    // ============================================
    occupancyHistory: [
      {
        tenant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tenant",
          required: true,
        },

        startDate: { type: Date, required: true },
        endDate: Date,
        vacatedDate: Date,

        monthlyRent: { type: Number, required: true },
        monthlyCam: { type: Number, required: true },

        reason: {
          type: String,
          enum: [
            "lease_ended",
            "tenant_vacated",
            "lease_terminated",
            "transferred",
            "other",
          ],
        },

        notes: String,
      },
    ],

    // ============================================
    // UNIT METADATA
    // ============================================
    actualSquareFeet: Number,
    floorNumber: Number,

    amenities: [String],

    lastMaintenanceDate: Date,
    nextMaintenanceDue: Date,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

//
// ============================================
// PRE-SAVE HOOK (RENT CALCULATION)
// ============================================
//
unitSchema.pre("save", function () {
  const lease = this.currentLease;

  if (
    !lease ||
    !lease.tenant ||
    !lease.leaseSquareFeet ||
    !lease.pricePerSqft ||
    lease.status !== "active"
  ) {
    this.isOccupied = false;
    return;
  }

  // Use rent calculator service (primary method - reverse TDS calculation)
  const tdsPercentage = lease.tdsPercentage || 10;
  const calculation = calculateUnitLease({
    sqft: lease.leaseSquareFeet,
    pricePerSqft: lease.pricePerSqft,
    camRatePerSqft: lease.camRatePerSqft || 0,
    tdsPercentage,
    securityDeposit: lease.securityDeposit || 0,
  });

  // Update lease with calculated values
  lease.tds = calculation.tdsPerSqft; // TDS per sqft (from reverse method)
  lease.monthlyRent = calculation.rentMonthly; // Rent after TDS
  lease.monthlyCam = calculation.camMonthly;
  lease.totalMonthly = calculation.netMonthly; // Rent + CAM

  this.isOccupied = true;
});

//
// ============================================
// VIRTUALS
// ============================================
//

// Gross rent before TDS
unitSchema.virtual("currentLease.grossAmount").get(function () {
  if (!this.currentLease?.pricePerSqft || !this.currentLease?.leaseSquareFeet) {
    return 0;
  }

  return this.currentLease.pricePerSqft * this.currentLease.leaseSquareFeet;
});

// Lease expiring soon (30 days)
unitSchema.virtual("isExpiringSoon").get(function () {
  if (!this.currentLease?.leaseEndDate) return false;

  const diffDays =
    (new Date(this.currentLease.leaseEndDate) - new Date()) /
    (1000 * 60 * 60 * 24);

  return diffDays > 0 && diffDays <= 30;
});

// Lease duration in months
unitSchema.virtual("leaseDurationMonths").get(function () {
  if (!this.currentLease?.leaseStartDate || !this.currentLease?.leaseEndDate) {
    return 0;
  }

  const start = new Date(this.currentLease.leaseStartDate);
  const end = new Date(this.currentLease.leaseEndDate);

  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
});

unitSchema.set("toJSON", { virtuals: true });
unitSchema.set("toObject", { virtuals: true });

//
// ============================================
// INSTANCE METHODS
// ============================================
//

unitSchema.methods.occupy = async function (leaseData) {
  if (this.isOccupied) {
    throw new Error(`Unit ${this.name} is already occupied`);
  }

  this.currentLease = {
    ...leaseData,
    status: "active",
  };

  return this.save();
};

unitSchema.methods.vacate = async function (vacateInfo = {}) {
  if (!this.currentLease) {
    throw new Error(`Unit ${this.name} is not occupied`);
  }

  this.occupancyHistory.push({
    tenant: this.currentLease.tenant,
    startDate: this.currentLease.leaseStartDate,
    endDate: this.currentLease.leaseEndDate,
    vacatedDate: vacateInfo.vacatedDate || new Date(),
    monthlyRent: this.currentLease.monthlyRent,
    monthlyCam: this.currentLease.monthlyCam,
    reason: vacateInfo.reason || "tenant_vacated",
    notes: vacateInfo.notes,
  });

  this.currentLease = undefined;
  this.isOccupied = false;

  return this.save();
};

unitSchema.methods.updateRates = async function (rates) {
  if (!this.currentLease) {
    throw new Error(`Unit ${this.name} has no active lease`);
  }

  if (rates.pricePerSqft !== undefined) {
    this.currentLease.pricePerSqft = rates.pricePerSqft;
  }

  if (rates.camRatePerSqft !== undefined) {
    this.currentLease.camRatePerSqft = rates.camRatePerSqft;
  }

  return this.save();
};

//
// ============================================
// STATICS
// ============================================
//

unitSchema.statics.getVacantUnits = function (propertyId, blockId = null) {
  const filter = {
    property: propertyId,
    isOccupied: false,
    isDeleted: false,
  };

  if (blockId) filter.block = blockId;

  return this.find(filter)
    .populate("property block innerBlock")
    .sort({ name: 1 });
};

unitSchema.statics.getOccupiedUnits = function (propertyId, blockId = null) {
  const filter = {
    property: propertyId,
    isOccupied: true,
    "currentLease.status": "active",
    isDeleted: false,
  };

  if (blockId) filter.block = blockId;

  return this.find(filter)
    .populate("property block innerBlock currentLease.tenant")
    .sort({ name: 1 });
};

unitSchema.statics.getExpiringSoon = function (days = 30, propertyId = null) {
  const future = new Date();
  future.setDate(future.getDate() + days);

  const filter = {
    isOccupied: true,
    "currentLease.leaseEndDate": {
      $gte: new Date(),
      $lte: future,
    },
    isDeleted: false,
  };

  if (propertyId) filter.property = propertyId;

  return this.find(filter)
    .populate("property block innerBlock currentLease.tenant")
    .sort({ "currentLease.leaseEndDate": 1 });
};

//
// ============================================
// INDEXES
// ============================================
//
unitSchema.index({ property: 1, isOccupied: 1 });
unitSchema.index({ property: 1, block: 1, innerBlock: 1 });
unitSchema.index({ "currentLease.tenant": 1, isOccupied: 1 });
unitSchema.index({ "currentLease.leaseEndDate": 1 });
unitSchema.index({ isDeleted: 1 });

export const Unit = mongoose.models.Unit || mongoose.model("Unit", unitSchema);
