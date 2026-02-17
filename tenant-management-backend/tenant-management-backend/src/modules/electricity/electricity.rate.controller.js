/**
 * electricity.rate.controller.js
 *
 * Endpoints for the property owner to configure electricity rates.
 * Kept separate from electricity.controller.js for clarity.
 */

import { electricityService } from "./electricity.service.js";

/**
 * GET /api/electricity/rate/:propertyId
 * Returns current rate + full history for the owner dashboard.
 */
export const getElectricityRate = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const data = await electricityService.getPropertyRate(propertyId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching electricity rate:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/electricity/rate/:propertyId
 * Body: {
 *   ratePerUnit:    number   (rupees, e.g. 12.50)
 *   note:           string   optional — "NEA revision Q1 2082"
 *   meterTypeRates: {        optional per-type overrides (rupees)
 *     common_area?: number
 *     parking?:     number
 *     sub_meter?:   number
 *   }
 * }
 *
 * Validates: rate > 0, integer paisa after conversion.
 * Appends to rate history — old rates are never overwritten (audit trail).
 */
export const setElectricityRate = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { ratePerUnit, note, meterTypeRates } = req.body;

    if (
      !ratePerUnit ||
      isNaN(parseFloat(ratePerUnit)) ||
      parseFloat(ratePerUnit) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ratePerUnit is required and must be a positive number (e.g. 12.50)",
      });
    }

    const result = await electricityService.setPropertyRate(
      propertyId,
      parseFloat(ratePerUnit),
      req.admin.id,
      note ?? "",
      meterTypeRates ?? {},
    );

    res.status(200).json({
      success: true,
      message: `Rate set to Rs ${parseFloat(ratePerUnit).toFixed(2)} / kWh`,
      data: result,
    });
  } catch (error) {
    console.error("Error setting electricity rate:", error);
    res.status(error.message.includes("Invalid") ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};
