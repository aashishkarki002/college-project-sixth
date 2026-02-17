import { getAccountingSummary } from "./accounting.service.js";

/**
 * GET /api/accounting/summary
 * Optional query params:
 * - startDate, endDate (ISO)
 * - nepaliYear (number)
 * - quarter (1-4)
 */
export async function getAccountingSummaryController(req, res) {
  try {
    const { startDate, endDate, nepaliYear, quarter } = req.query;

    const summary = await getAccountingSummary({
      startDate,
      endDate,
      nepaliYear: nepaliYear ? parseInt(nepaliYear, 10) : undefined,
      quarter: quarter ? parseInt(quarter, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error in getAccountingSummaryController:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

