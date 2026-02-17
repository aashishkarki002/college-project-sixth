/**
 * submeter.controller.js
 *
 * CRUD for SubMeter documents (physical meters for common areas, parking, etc.)
 * and electricity readings created against them.
 *
 * Routes handled:
 *   POST   /api/electricity/sub-meters/create
 *   GET    /api/electricity/sub-meters/:propertyId
 *   GET    /api/electricity/sub-meters/detail/:subMeterId
 *   PUT    /api/electricity/sub-meters/update/:subMeterId
 *   DELETE /api/electricity/sub-meters/deactivate/:subMeterId
 *   POST   /api/electricity/sub-meters/create-reading
 *   GET    /api/electricity/sub-meters/readings/:subMeterId
 */

import mongoose from "mongoose";
import { SubMeter } from "./SubMeter.Model.js";
import { Electricity } from "./Electricity.Model.js";
import { ElectricityRate } from "./ElectricityRate.Model.js";
import { rupeesToPaisa } from "../../utils/moneyUtil.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Resolve the applicable paisa rate for a sub-meter.
 * Falls back to the property default if no per-type override exists.
 */
async function resolveSubMeterRate(propertyId, meterType) {
  const ratePaisa = await ElectricityRate.resolveRate(propertyId, meterType);
  return ratePaisa;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/electricity/sub-meters/create
 * Body: {
 *   name, meterType, description, propertyId,
 *   blockId?, innerBlockId?, locationLabel?,
 *   meterSerialNumber?, installedOn?
 * }
 */
export const createSubMeter = async (req, res) => {
  try {
    const {
      name,
      meterType,
      description,
      propertyId,
      blockId,
      innerBlockId,
      locationLabel,
      meterSerialNumber,
      installedOn,
    } = req.body;

    if (!name || !meterType || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "name, meterType, and propertyId are required",
      });
    }

    const VALID_TYPES = ["common_area", "parking", "sub_meter"];
    if (!VALID_TYPES.includes(meterType)) {
      return res.status(400).json({
        success: false,
        message: `meterType must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    const subMeter = await SubMeter.create({
      name,
      meterType,
      description: description ?? "",
      property: propertyId,
      block: blockId ?? null,
      innerBlock: innerBlockId ?? null,
      locationLabel: locationLabel ?? "",
      meterSerialNumber: meterSerialNumber ?? "",
      installedOn: installedOn ? new Date(installedOn) : null,
      isActive: true,
      createdBy: req.admin.id,
    });

    res.status(201).json({
      success: true,
      message: "Sub-meter created successfully",
      data: subMeter,
    });
  } catch (error) {
    console.error("Error creating sub-meter:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create sub-meter",
    });
  }
};

/**
 * GET /api/electricity/sub-meters/:propertyId
 * Query: meterType?, isActive?
 *
 * Returns all sub-meters for a property, each enriched with:
 *   - lastReading (denormalised from SubMeter doc)
 *   - currentRate (resolved from ElectricityRate config)
 *   - totalReadings count
 */
export const getSubMeters = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { meterType, isActive } = req.query;

    const filter = { property: propertyId };
    if (meterType) filter.meterType = meterType;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const subMeters = await SubMeter.find(filter)
      .populate("block", "name")
      .populate("innerBlock", "name")
      .populate("createdBy", "name")
      .populate("lastReading.recordId", "consumption totalAmountPaisa")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich each sub-meter with reading count + rate info
    const enriched = await Promise.all(
      subMeters.map(async (sm) => {
        const [count, rateConfig] = await Promise.all([
          Electricity.countDocuments({ subMeter: sm._id }),
          ElectricityRate.findOne({ property: propertyId }).lean(),
        ]);

        let currentRatePerUnit = null;
        if (rateConfig) {
          const override = rateConfig.meterTypeRates?.[sm.meterType];
          const paisa = override ?? rateConfig.currentRatePerUnitPaisa;
          currentRatePerUnit = paisa / 100;
        }

        return {
          ...sm,
          totalReadings: count,
          currentRatePerUnit,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("Error fetching sub-meters:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sub-meters",
    });
  }
};

/**
 * GET /api/electricity/sub-meters/detail/:subMeterId
 */
export const getSubMeterById = async (req, res) => {
  try {
    const { subMeterId } = req.params;

    const subMeter = await SubMeter.findById(subMeterId)
      .populate("block", "name")
      .populate("innerBlock", "name")
      .populate("createdBy", "name")
      .lean();

    if (!subMeter) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-meter not found" });
    }

    // Last 6 readings for sparkline / trend
    const recentReadings = await Electricity.find({ subMeter: subMeterId })
      .sort({ readingDate: -1 })
      .limit(6)
      .lean();

    res.status(200).json({
      success: true,
      data: { ...subMeter, recentReadings },
    });
  } catch (error) {
    console.error("Error fetching sub-meter:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sub-meter",
    });
  }
};

/**
 * PUT /api/electricity/sub-meters/update/:subMeterId
 * Body: any updatable fields (name, description, locationLabel, meterSerialNumber, isActive)
 */
export const updateSubMeter = async (req, res) => {
  try {
    const { subMeterId } = req.params;
    const {
      name,
      description,
      locationLabel,
      meterSerialNumber,
      installedOn,
      isActive,
    } = req.body;

    const subMeter = await SubMeter.findById(subMeterId);
    if (!subMeter) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-meter not found" });
    }

    if (name !== undefined) subMeter.name = name;
    if (description !== undefined) subMeter.description = description;
    if (locationLabel !== undefined) subMeter.locationLabel = locationLabel;
    if (meterSerialNumber !== undefined)
      subMeter.meterSerialNumber = meterSerialNumber;
    if (installedOn !== undefined)
      subMeter.installedOn = installedOn ? new Date(installedOn) : null;
    if (isActive !== undefined) subMeter.isActive = Boolean(isActive);

    await subMeter.save();

    res.status(200).json({
      success: true,
      message: "Sub-meter updated successfully",
      data: subMeter,
    });
  } catch (error) {
    console.error("Error updating sub-meter:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update sub-meter",
    });
  }
};

/**
 * DELETE /api/electricity/sub-meters/deactivate/:subMeterId
 * Soft delete — sets isActive = false to preserve reading history.
 */
export const deactivateSubMeter = async (req, res) => {
  try {
    const { subMeterId } = req.params;

    const subMeter = await SubMeter.findByIdAndUpdate(
      subMeterId,
      { isActive: false },
      { new: true },
    );

    if (!subMeter) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-meter not found" });
    }

    res.status(200).json({
      success: true,
      message: "Sub-meter deactivated. Reading history preserved.",
      data: subMeter,
    });
  } catch (error) {
    console.error("Error deactivating sub-meter:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to deactivate sub-meter",
    });
  }
};

// ─── Readings ─────────────────────────────────────────────────────────────────

/**
 * POST /api/electricity/sub-meters/create-reading
 * Body: {
 *   subMeterId, currentReading,
 *   nepaliMonth, nepaliYear, nepaliDate,
 *   englishMonth, englishYear, readingDate?,
 *   notes?
 * }
 *
 * Rate is resolved from ElectricityRate config — same as unit readings.
 * No tenant/unit required (billed to property).
 */
export const createSubMeterReading = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      subMeterId,
      currentReading,
      nepaliMonth,
      nepaliYear,
      nepaliDate,
      englishMonth,
      englishYear,
      readingDate,
      notes,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!subMeterId || currentReading == null) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "subMeterId and currentReading are required",
      });
    }

    if (!nepaliMonth || !nepaliYear || !nepaliDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Nepali date fields (nepaliMonth, nepaliYear, nepaliDate) are required",
      });
    }

    // ── Load sub-meter ──────────────────────────────────────────────────────
    const subMeter = await SubMeter.findById(subMeterId).session(session);
    if (!subMeter) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Sub-meter not found" });
    }

    if (!subMeter.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Cannot add readings to a deactivated sub-meter",
      });
    }

    // ── Determine previous reading ──────────────────────────────────────────
    const lastReading = await Electricity.findOne({ subMeter: subMeterId })
      .sort({ readingDate: -1, createdAt: -1 })
      .session(session)
      .lean();

    const previousReading = lastReading ? lastReading.currentReading : 0;
    const parsedCurrent = parseFloat(currentReading);

    if (parsedCurrent < previousReading) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Current reading (${parsedCurrent}) cannot be less than previous reading (${previousReading})`,
      });
    }

    // ── Resolve rate ────────────────────────────────────────────────────────
    let ratePerUnitPaisa;
    try {
      ratePerUnitPaisa = await resolveSubMeterRate(
        subMeter.property.toString(),
        subMeter.meterType,
      );
    } catch (rateError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: rateError.message,
      });
    }

    // ── Calculate financials ────────────────────────────────────────────────
    const consumption = parsedCurrent - previousReading;
    const totalAmountPaisa = Math.round(consumption * ratePerUnitPaisa);

    // ── Persist electricity reading ─────────────────────────────────────────
    const [electricity] = await Electricity.create(
      [
        {
          meterType: subMeter.meterType,
          billTo: "property",
          subMeter: subMeterId,
          property: subMeter.property,
          tenant: null,
          unit: null,
          previousReading,
          currentReading: parsedCurrent,
          consumption,
          ratePerUnitPaisa,
          totalAmountPaisa,
          paidAmountPaisa: 0,
          nepaliMonth: parseInt(nepaliMonth),
          nepaliYear: parseInt(nepaliYear),
          nepaliDate,
          englishMonth: parseInt(englishMonth),
          englishYear: parseInt(englishYear),
          readingDate: readingDate ? new Date(readingDate) : new Date(),
          status: "pending",
          notes: notes ?? "",
          isInitialReading: !lastReading,
          createdBy: req.admin.id,
        },
      ],
      { session },
    );

    // ── Update denormalised lastReading on SubMeter ─────────────────────────
    await SubMeter.findByIdAndUpdate(
      subMeterId,
      {
        lastReading: {
          value: parsedCurrent,
          readingDate: electricity.readingDate,
          recordId: electricity._id,
        },
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Sub-meter reading recorded successfully",
      data: {
        ...electricity.toObject(),
        ratePerUnit: ratePerUnitPaisa / 100,
        totalAmount: totalAmountPaisa / 100,
        previousReading,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating sub-meter reading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create sub-meter reading",
    });
  }
};

/**
 * GET /api/electricity/sub-meters/readings/:subMeterId
 * Query: limit?, nepaliYear?, nepaliMonth?
 */
export const getSubMeterReadings = async (req, res) => {
  try {
    const { subMeterId } = req.params;
    const { limit, nepaliYear, nepaliMonth } = req.query;

    const filter = { subMeter: subMeterId };
    if (nepaliYear) filter.nepaliYear = parseInt(nepaliYear);
    if (nepaliMonth) filter.nepaliMonth = parseInt(nepaliMonth);

    const readings = await Electricity.find(filter)
      .sort({ readingDate: -1 })
      .limit(limit ? parseInt(limit) : 24)
      .lean();

    // Map paisa → rupees for frontend
    const mapped = readings.map((r) => ({
      ...r,
      ratePerUnit: r.ratePerUnitPaisa / 100,
      totalAmount: r.totalAmountPaisa / 100,
      paidAmount: r.paidAmountPaisa / 100,
    }));

    const totalConsumption = readings.reduce(
      (s, r) => s + (r.consumption ?? 0),
      0,
    );
    const totalAmountPaisa = readings.reduce(
      (s, r) => s + (r.totalAmountPaisa ?? 0),
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        readings: mapped,
        summary: {
          totalReadings: readings.length,
          totalConsumption,
          totalAmount: totalAmountPaisa / 100,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sub-meter readings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sub-meter readings",
    });
  }
};
