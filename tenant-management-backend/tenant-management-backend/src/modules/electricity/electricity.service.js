/**
 * electricity.service.js — updated
 *
 * Key changes vs original:
 *   1. createElectricityReading now auto-resolves ratePerUnitPaisa from the
 *      owner's ElectricityRate config. A passed-in ratePerUnit is ignored
 *      (callers no longer need to supply it).
 *   2. Revenue note: recordElectricityCharge posts to an INCOME account
 *      (Electricity Revenue) owned by the property. The journal builder
 *      is responsible for the CR side — see comments below.
 *   3. setPropertyRate / getPropertyRate let the owner manage rates.
 *   4. getPropertyRate now exposes the "unit" per-type override so the
 *      dashboard can display and the rate dialog can pre-populate it.
 */

import { Electricity } from "./Electricity.Model.js";
import { ElectricityRate } from "./ElectricityRate.Model.js";
import { Tenant } from "../tenant/Tenant.Model.js";
import { Unit } from "../units/Unit.Model.js";
import { ledgerService } from "../ledger/ledger.service.js";
import {
  buildElectricityChargeJournal,
  buildElectricityPaymentJournal,
} from "../ledger/journal-builders/electricity.js";
import {
  rupeesToPaisa,
  paisaToRupees,
  formatMoney,
} from "../../utils/moneyUtil.js";

class ElectricityService {
  // ─────────────────────────────────────────────────────────────────────────
  // RATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the current rate config for a property.
   * Returns the full document (currentRate + history + per-type overrides).
   *
   * meterTypeRates now includes "unit" so the dashboard can show the
   * tenant-billed unit rate separately from sub-meter rates.
   */
  async getPropertyRate(propertyId) {
    const config = await ElectricityRate.findOne({ property: propertyId })
      .populate("rateHistory.setBy", "name email")
      .lean();

    if (!config) {
      return { configured: false, currentRatePerUnit: null, rateHistory: [] };
    }

    return {
      configured: true,
      currentRatePerUnit: config.currentRatePerUnitPaisa / 100,
      currentRatePerUnitPaisa: config.currentRatePerUnitPaisa,
      // All four meter-type overrides exposed (null = falls back to default)
      meterTypeRates: {
        unit: config.meterTypeRates?.unit
          ? config.meterTypeRates.unit / 100
          : null,
        common_area: config.meterTypeRates?.common_area
          ? config.meterTypeRates.common_area / 100
          : null,
        parking: config.meterTypeRates?.parking
          ? config.meterTypeRates.parking / 100
          : null,
        sub_meter: config.meterTypeRates?.sub_meter
          ? config.meterTypeRates.sub_meter / 100
          : null,
      },
      rateHistory: (config.rateHistory ?? []).map((h) => ({
        ...h,
        ratePerUnit: h.ratePerUnitPaisa / 100,
      })),
    };
  }

  /**
   * Set (or update) the rate for a property.
   * Appends to rateHistory — existing entries are never modified.
   *
   * @param {string}  propertyId
   * @param {number}  ratePerUnit        - in rupees (e.g. 12.50)
   * @param {string}  setBy              - admin id
   * @param {string}  [note]             - reason / reference (e.g. "NEA tariff Q1 2082")
   * @param {Object}  [meterTypeRates]   - { unit, common_area, parking, sub_meter } in rupees
   *                                       Pass null/undefined for a type to clear its override.
   */
  async setPropertyRate(
    propertyId,
    ratePerUnit,
    setBy,
    note = "",
    meterTypeRates = {},
  ) {
    const ratePerUnitPaisa = rupeesToPaisa(ratePerUnit);

    if (!Number.isInteger(ratePerUnitPaisa) || ratePerUnitPaisa < 1) {
      throw new Error(
        "Rate must be a positive value (e.g. 12.50 rupees per kWh).",
      );
    }

    const newEntry = {
      ratePerUnitPaisa,
      effectiveFrom: new Date(),
      effectiveTo: null,
      note,
      setBy,
    };

    // Convert supplied rupee overrides to paisa. Supported types include "unit".
    const SUPPORTED_TYPES = ["unit", "common_area", "parking", "sub_meter"];
    const meterTypeRatesPaisa = {};

    for (const type of SUPPORTED_TYPES) {
      const val = meterTypeRates[type];
      if (val != null && val !== "" && parseFloat(val) > 0) {
        const paisa = rupeesToPaisa(parseFloat(val));
        if (!Number.isInteger(paisa))
          throw new Error(`Invalid rate for meter type "${type}"`);
        meterTypeRatesPaisa[type] = paisa;
      } else if (type in meterTypeRates) {
        // Explicitly passed null / empty string → clear the override
        meterTypeRatesPaisa[type] = null;
      }
    }

    const config = await ElectricityRate.findOne({ property: propertyId });

    if (config) {
      // Close out the previous active entry
      const prev = config.rateHistory.find((h) => h.effectiveTo === null);
      if (prev) prev.effectiveTo = new Date();

      config.currentRatePerUnitPaisa = ratePerUnitPaisa;

      // Merge overrides — only update keys that were explicitly supplied
      const existing = config.meterTypeRates.toObject?.() ?? {
        ...config.meterTypeRates,
      };
      config.meterTypeRates = { ...existing, ...meterTypeRatesPaisa };

      config.rateHistory.push(newEntry);
      await config.save();
    } else {
      await ElectricityRate.create({
        property: propertyId,
        currentRatePerUnitPaisa: ratePerUnitPaisa,
        meterTypeRates: meterTypeRatesPaisa,
        rateHistory: [newEntry],
      });
    }

    return { success: true, ratePerUnit, ratePerUnitPaisa };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READINGS
  // ─────────────────────────────────────────────────────────────────────────

  async getLastReadingForUnit(unitId, session = null) {
    const query = Electricity.findOne({ unit: unitId }).sort({
      readingDate: -1,
      createdAt: -1,
    });
    if (session) query.session(session);
    return await query.lean();
  }

  /**
   * Create a new electricity reading.
   *
   * Rate is resolved automatically from the owner's ElectricityRate config.
   * For unit (tenant) readings, the "unit" per-type override is checked first,
   * then falls back to the property default.
   *
   * Revenue accounting (handled by buildElectricityChargeJournal):
   *   DR  Tenant Receivable (asset ↑)
   *   CR  Electricity Revenue – [Property]  (income ↑ → owner's revenue)
   */
  async createElectricityReading(data, session = null) {
    // 1. Validate tenant & unit
    const tenant = await Tenant.findById(data.tenantId).session(session);
    if (!tenant) throw new Error("Tenant not found");

    const unit = await Unit.findById(data.unitId).session(session);
    if (!unit) throw new Error("Unit not found");

    if (!tenant.units.some((u) => u.toString() === data.unitId.toString())) {
      throw new Error("Unit does not belong to this tenant");
    }

    // 2. Determine previousReading
    const lastReading = await this.getLastReadingForUnit(data.unitId, session);
    let previousReading = 0;
    let isInitialReading = false;
    let isTenantTransition = false;
    let previousTenant = null;
    let previousRecord = null;

    if (lastReading) {
      if (lastReading.tenant.toString() !== data.tenantId.toString()) {
        isTenantTransition = true;
        previousTenant = lastReading.tenant;
        previousRecord = lastReading._id;
      }
      previousReading = lastReading.currentReading;
    } else {
      isInitialReading = true;
      previousReading = data.previousReading ?? 0;
    }

    if (data.previousReading != null) previousReading = data.previousReading;

    if (data.currentReading < previousReading) {
      throw new Error(
        `Current reading (${data.currentReading}) cannot be less than previous reading (${previousReading})`,
      );
    }

    // 3. ── Resolve rate from owner config ──
    //    For unit readings, resolveRate checks meterTypeRates.unit first,
    //    then falls back to the property default rate.
    //    If the caller supplies an explicit ratePerUnit override, use it but log a warning.
    let ratePerUnitPaisa;
    let rateOverridden = false;

    if (data.ratePerUnit != null || data.ratePerUnitPaisa != null) {
      // Explicit override — allowed but flagged
      ratePerUnitPaisa =
        data.ratePerUnitPaisa ?? rupeesToPaisa(data.ratePerUnit);
      rateOverridden = true;
      console.warn(
        `[ElectricityService] Rate override used for property ${tenant.property}. ` +
          `Supplied: ${ratePerUnitPaisa} paisa. This bypasses the owner's configured rate.`,
      );
    } else {
      // meterType defaults to "unit" — resolveRate will check meterTypeRates.unit
      ratePerUnitPaisa = await ElectricityRate.resolveRate(
        tenant.property,
        data.meterType ?? "unit",
      );
    }

    if (!Number.isInteger(ratePerUnitPaisa) || ratePerUnitPaisa < 1) {
      throw new Error(`Invalid resolved rate: ${ratePerUnitPaisa} paisa`);
    }

    // 4. Calculate financials
    const consumption = data.currentReading - previousReading;
    const totalAmountPaisa = Math.round(consumption * ratePerUnitPaisa);

    // 5. Persist
    const [electricity] = await Electricity.create(
      [
        {
          tenant: data.tenantId,
          property: tenant.property,
          unit: data.unitId,
          previousReading,
          currentReading: data.currentReading,
          consumption,
          ratePerUnitPaisa,
          totalAmountPaisa,
          paidAmountPaisa: 0,
          nepaliMonth: data.nepaliMonth,
          nepaliYear: data.nepaliYear,
          nepaliDate: data.nepaliDate,
          englishMonth: data.englishMonth,
          englishYear: data.englishYear,
          readingDate: data.readingDate ?? new Date(),
          status: "pending",
          notes: data.notes ?? "",
          isInitialReading,
          isTenantTransition,
          previousTenant,
          previousRecord,
          createdBy: data.createdBy,
          // Meta: was rate manually overridden?
          ...(rateOverridden
            ? { notes: `[RATE OVERRIDE] ${data.notes ?? ""}`.trim() }
            : {}),
        },
      ],
      { session },
    );

    return {
      success: true,
      message: isTenantTransition
        ? "Electricity reading created with tenant transition"
        : "Electricity reading created successfully",
      data: electricity,
    };
  }

  /**
   * Record electricity charge in ledger.
   *
   * This posts electricity as REVENUE for the property owner.
   * The journal builder (buildElectricityChargeJournal) must produce:
   *   DR  accounts_receivable   (tenant owes money)
   *   CR  electricity_revenue   (income account — owner earns revenue)
   *
   * This is the correct treatment: electricity is a utility income stream,
   * not a contra-expense. The owner buys bulk from NEA and resells per-unit.
   */
  async recordElectricityCharge(electricityId, session = null) {
    const electricity = await Electricity.findById(electricityId)
      .populate("tenant")
      .populate("unit")
      .session(session);

    if (!electricity) throw new Error("Electricity record not found");

    const payload = buildElectricityChargeJournal(electricity);
    const { transaction, ledgerEntries } = await ledgerService.postJournalEntry(
      payload,
      session,
    );

    return { success: true, transaction, ledgerEntries };
  }

  /**
   * Record electricity payment.
   * DR  bank / cash  (asset ↑)
   * CR  accounts_receivable  (tenant owes less)
   */
  async recordElectricityPayment(paymentData, session = null) {
    const electricity = await Electricity.findById(
      paymentData.electricityId,
    ).session(session);

    if (!electricity) throw new Error("Electricity record not found");

    const paymentAmountPaisa =
      paymentData.amountPaisa ?? rupeesToPaisa(paymentData.amount);

    const newPaidPaisa = electricity.paidAmountPaisa + paymentAmountPaisa;
    if (newPaidPaisa > electricity.totalAmountPaisa) {
      throw new Error(
        `Payment of Rs ${paymentAmountPaisa / 100} exceeds remaining due ` +
          `Rs ${(electricity.totalAmountPaisa - electricity.paidAmountPaisa) / 100}`,
      );
    }

    electricity.paidAmountPaisa = newPaidPaisa;
    electricity.status =
      electricity.paidAmountPaisa >= electricity.totalAmountPaisa
        ? "paid"
        : "partially_paid";

    electricity.paidDate = paymentData.paymentDate ?? new Date();

    if (paymentData.receipt) {
      electricity.receipt = {
        url: paymentData.receipt,
        publicId: paymentData.publicId,
        generatedAt: new Date(),
      };
    }

    await electricity.save({ session });

    const payload = buildElectricityPaymentJournal(paymentData, electricity);
    const { transaction, ledgerEntries } = await ledgerService.postJournalEntry(
      payload,
      session,
    );

    return { success: true, electricity, transaction, ledgerEntries };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERIES (unchanged from original, kept for completeness)
  // ─────────────────────────────────────────────────────────────────────────

  async getElectricityReadings(filters = {}) {
    const query = {};

    // Basic filters
    if (filters.tenantId) query.tenant = filters.tenantId;
    if (filters.unitId) query.unit = filters.unitId;
    if (filters.propertyId) query.property = filters.propertyId;
    if (filters.nepaliYear) query.nepaliYear = filters.nepaliYear;
    if (filters.nepaliMonth) query.nepaliMonth = filters.nepaliMonth;
    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    /**
     * BLOCK / INNER BLOCK FILTER
     * Ignore when blockId === "all"
     */
    if (
      (filters.blockId && filters.blockId !== "all") ||
      filters.innerBlockId
    ) {
      const unitQuery = {};

      if (filters.blockId && filters.blockId !== "all") {
        unitQuery.block = filters.blockId;
      }

      if (filters.innerBlockId) {
        unitQuery.innerBlock = filters.innerBlockId;
      }

      const units = await Unit.find(unitQuery).select("_id").lean();
      const unitIds = units.map((u) => u._id);

      query.unit = unitIds.length ? { $in: unitIds } : { $in: [] };
    }

    /**
     * DATE RANGE FILTER
     */
    if (filters.startDate || filters.endDate) {
      query.readingDate = {};

      if (filters.startDate) {
        query.readingDate.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query.readingDate.$lte = end;
      }
    }

    const readings = await Electricity.find(query)
      .populate("tenant", "name email phone")
      .populate({
        path: "unit",
        select: "name unitName type",
        populate: [
          { path: "block", select: "name" },
          { path: "innerBlock", select: "name" },
        ],
      })
      .populate("property", "name address")
      .populate("previousTenant", "name")
      .sort({ readingDate: -1, createdAt: -1 });

    // Summary calculations (paisa)
    const totalAmountPaisa = readings.reduce(
      (s, r) => s + (r.totalAmountPaisa ?? 0),
      0,
    );

    const totalPaidPaisa = readings.reduce(
      (s, r) => s + (r.paidAmountPaisa ?? 0),
      0,
    );

    const totalConsumption = readings.reduce(
      (s, r) => s + (r.consumption ?? 0),
      0,
    );

    const averageConsumption = readings.length
      ? totalConsumption / readings.length
      : 0;

    // Map to plain objects with virtuals (ratePerUnit, totalAmount, paidAmount,
    // remainingAmount, *Formatted) — same pattern as Rent module
    const readingsForResponse = readings.map((r) =>
      r.toObject({ virtuals: true }),
    );

    return {
      success: true,
      data: {
        readings: readingsForResponse,
        summary: {
          totalReadings: readings.length,
          totalConsumption,
          totalAmount: paisaToRupees(totalAmountPaisa),
          totalPaid: paisaToRupees(totalPaidPaisa),
          totalPending: paisaToRupees(
            Math.max(0, totalAmountPaisa - totalPaidPaisa),
          ),
          averageConsumption,
          formatted: {
            totalAmount: formatMoney(totalAmountPaisa),
            totalPaid: formatMoney(totalPaidPaisa),
            totalPending: formatMoney(
              Math.max(0, totalAmountPaisa - totalPaidPaisa),
            ),
          },
        },
      },
    };
  }

  async getUnitConsumptionHistory(unitId, limit = 12) {
    const history = await Electricity.find({ unit: unitId })
      .populate("tenant", "name")
      .sort({ readingDate: -1 })
      .limit(limit);

    const historyForResponse = history.map((doc) =>
      doc.toObject({ virtuals: true }),
    );
    return { success: true, data: historyForResponse };
  }
}

export const electricityService = new ElectricityService();
