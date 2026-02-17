import { electricityService } from "./electricity.service.js";
import mongoose from "mongoose";

/**
 * Create a new electricity reading
 * POST /api/electricity/create-reading
 * Body: {
 *   tenantId, unitId, currentReading, ratePerUnit,
 *   nepaliMonth, nepaliYear, nepaliDate,
 *   englishMonth, englishYear, readingDate,
 *   notes, previousReading (optional - for manual override)
 * }
 */
export const createElectricityReading = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      tenantId,
      unitId,
      currentReading,
      nepaliMonth,
      nepaliYear,
      nepaliDate,
      englishMonth,
      englishYear,
      readingDate,
      notes,
      previousReading,
    } = req.body;

    // Validation
    if (!tenantId || !unitId || !currentReading) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Required fields: tenantId, unitId, currentReading",
      });
    }

    if (!nepaliMonth || !nepaliYear || !nepaliDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Nepali date information is required",
      });
    }

    // Create electricity reading
    const result = await electricityService.createElectricityReading(
      {
        tenantId,
        unitId,
        currentReading: parseFloat(currentReading),
        nepaliMonth: parseInt(nepaliMonth),
        nepaliYear: parseInt(nepaliYear),
        nepaliDate,
        englishMonth: parseInt(englishMonth),
        englishYear: parseInt(englishYear),
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        notes,
        previousReading: previousReading
          ? parseFloat(previousReading)
          : undefined,
        createdBy: req.admin.id,
      },
      session,
    );

    // Record in ledger if amount > 0
    if (result.data.totalAmount > 0) {
      await electricityService.recordElectricityCharge(
        result.data._id,
        session,
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating electricity reading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create electricity reading",
    });
  }
};

/**
 * Get electricity readings with filters
 * GET /api/electricity/get-readings
 * Query params: tenantId, unitId, propertyId, nepaliYear, nepaliMonth, status, startDate, endDate
 */
export const getElectricityReadings = async (req, res) => {
  try {
    const {
      tenantId,
      unitId,
      propertyId,
      blockId,
      innerBlockId,
      nepaliYear,
      nepaliMonth,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await electricityService.getElectricityReadings({
      tenantId,
      unitId,
      propertyId,
      blockId: blockId || undefined,
      innerBlockId: innerBlockId || undefined,
      nepaliYear: nepaliYear ? parseInt(nepaliYear) : undefined,
      nepaliMonth: nepaliMonth ? parseInt(nepaliMonth) : undefined,
      status,
      startDate,
      endDate,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting electricity readings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get electricity readings",
    });
  }
};

/**
 * Get electricity reading by ID
 * GET /api/electricity/get-reading/:id
 */
export const getElectricityReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await electricityService.getElectricityReadings({
      _id: id,
    });

    if (!reading.data.readings || reading.data.readings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Electricity reading not found",
      });
    }

    res.status(200).json({
      success: true,
      data: reading.data.readings[0],
    });
  } catch (error) {
    console.error("Error getting electricity reading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get electricity reading",
    });
  }
};

/**
 * Record electricity payment
 * POST /api/electricity/record-payment
 * Body: { electricityId, amount, paymentDate, nepaliDate }
 * File: receiptImage (optional)
 */
export const recordElectricityPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { electricityId, amount, paymentDate, nepaliDate } = req.body;

    if (!electricityId || !amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "electricityId and amount are required",
      });
    }

    let receiptImageUrl = null;

    // Handle receipt image upload if provided
    if (req.file) {
      const cloudinary = (await import("cloudinary")).v2;
      const fs = (await import("fs")).default;
      const path = (await import("path")).default;

      // Save temp file
      const tempDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, req.file.originalname);
      fs.writeFileSync(tempPath, req.file.buffer);

      try {
        // Upload to cloudinary
        const uploadResult = await cloudinary.uploader.upload(tempPath, {
          folder: "electricity/receipts",
          transformation: [{ width: 1000, height: 1000, crop: "limit" }],
          use_filename: true,
          unique_filename: true,
        });

        receiptImageUrl = uploadResult.secure_url;

        // Delete temp file
        fs.unlinkSync(tempPath);
      } catch (uploadError) {
        // Clean up temp file on error
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw new Error(
          `Failed to upload receipt image: ${uploadError.message}`,
        );
      }
    }

    const result = await electricityService.recordElectricityPayment(
      {
        electricityId,
        amount: parseFloat(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        nepaliDate,
        receipt: receiptImageUrl,
        createdBy: req.admin.id,
      },
      session,
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(result);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error recording electricity payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record electricity payment",
    });
  }
};

/**
 * Get unit consumption history
 * GET /api/electricity/unit-history/:unitId
 */
export const getUnitConsumptionHistory = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { limit } = req.query;

    const result = await electricityService.getUnitConsumptionHistory(
      unitId,
      limit ? parseInt(limit) : 12,
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting unit consumption history:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get unit consumption history",
    });
  }
};

/**
 * Get tenant electricity summary
 * GET /api/electricity/tenant-summary/:tenantId
 */
export const getTenantElectricitySummary = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { nepaliYear } = req.query;

    const result = await electricityService.getElectricityReadings({
      tenantId,
      nepaliYear: nepaliYear ? parseInt(nepaliYear) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        readings: result.data.readings,
        summary: result.data.summary,
      },
    });
  } catch (error) {
    console.error("Error getting tenant electricity summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get tenant electricity summary",
    });
  }
};

/**
 * Update electricity reading
 * PUT /api/electricity/update-reading/:id
 */
export const updateElectricityReading = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { currentReading, ratePerUnit, notes, status } = req.body;

    const Electricity = (await import("./Electricity.Model.js")).Electricity;

    const electricity = await Electricity.findById(id).session(session);

    if (!electricity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Electricity reading not found",
      });
    }

    // Update fields
    if (currentReading !== undefined) {
      if (parseFloat(currentReading) < electricity.previousReading) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Current reading cannot be less than previous reading",
        });
      }
      electricity.currentReading = parseFloat(currentReading);
    }

    if (ratePerUnit !== undefined) {
      electricity.ratePerUnit = parseFloat(ratePerUnit);
    }

    if (notes !== undefined) {
      electricity.notes = notes;
    }

    if (status !== undefined) {
      electricity.status = status;
    }

    await electricity.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Electricity reading updated successfully",
      data: electricity,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating electricity reading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update electricity reading",
    });
  }
};

/**
 * Delete electricity reading (soft delete by setting status to 'cancelled')
 * DELETE /api/electricity/delete-reading/:id
 */
export const deleteElectricityReading = async (req, res) => {
  try {
    const { id } = req.params;

    const Electricity = (await import("./Electricity.Model.js")).Electricity;

    const electricity = await Electricity.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true },
    );

    if (!electricity) {
      return res.status(404).json({
        success: false,
        message: "Electricity reading not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Electricity reading cancelled successfully",
      data: electricity,
    });
  } catch (error) {
    console.error("Error deleting electricity reading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete electricity reading",
    });
  }
};
