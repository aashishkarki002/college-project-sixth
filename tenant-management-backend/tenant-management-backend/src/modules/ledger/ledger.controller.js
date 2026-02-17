import { ledgerService } from "./ledger.service.js";

/**
 * Get ledger entries with various filtering options
 * Query parameters:
 * - tenantId: Filter by specific tenant
 * - startDate: Start date (English calendar) - ISO format
 * - endDate: End date (English calendar) - ISO format
 * - nepaliMonth: Nepali month name (e.g., "बैशाख")
 * - nepaliYear: Nepali year (e.g., 2081)
 * - quarter: Quarter number (1-4)
 * - accountCode: Filter by specific account code
 * - propertyId: Filter by specific property
 */
export const getLedger = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      tenantId,
      nepaliMonth,
      nepaliYear,
      quarter,
      accountCode,
      propertyId,
      type,
    } = req.query;

    // Validate type if provided
    if (type && !["all", "revenue", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'all', 'revenue', or 'expense'",
      });
    }

    // Validate quarter if provided
    if (quarter && (quarter < 1 || quarter > 4)) {
      return res.status(400).json({
        success: false,
        message: "Quarter must be between 1 and 4",
      });
    }

    // Validate nepaliYear if provided
    if (nepaliYear && (nepaliYear < 2000 || nepaliYear > 2100)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Nepali year",
      });
    }

    const ledger = await ledgerService.getLedger({
      startDate,
      endDate,
      tenantId,
      nepaliMonth,
      nepaliYear: nepaliYear ? parseInt(nepaliYear) : undefined,
      quarter: quarter ? parseInt(quarter) : undefined,
      accountCode,
      propertyId,
      type: type || "all", // Default to 'all' if not specified
    });

    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    console.error("Error in getLedger controller:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get ledger summary by account
 * Provides aggregated view of debits, credits, and balances per account
 */
export const getLedgerSummary = async (req, res) => {
  try {
    const { startDate, endDate, tenantId, nepaliYear, quarter } = req.query;

    const summary = await ledgerService.getLedgerSummary({
      startDate,
      endDate,
      tenantId,
      nepaliYear: nepaliYear ? parseInt(nepaliYear) : undefined,
      quarter: quarter ? parseInt(quarter) : undefined,
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error("Error in getLedgerSummary controller:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get tenant-specific ledger statement
 * Shows running balance for a specific tenant
 */
export const getTenantLedger = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate, nepaliYear, quarter } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const ledger = await ledgerService.getLedger({
      tenantId,
      startDate,
      endDate,
      nepaliYear: nepaliYear ? parseInt(nepaliYear) : undefined,
      quarter: quarter ? parseInt(quarter) : undefined,
    });

    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    console.error("Error in getTenantLedger controller:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get account-specific ledger
 * Shows all transactions for a specific account
 */
export const getAccountLedger = async (req, res) => {
  try {
    const { accountCode } = req.params;
    const { startDate, endDate, tenantId } = req.query;

    if (!accountCode) {
      return res.status(400).json({
        success: false,
        message: "Account code is required",
      });
    }

    const ledger = await ledgerService.getLedger({
      accountCode,
      startDate,
      endDate,
      tenantId,
    });

    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    console.error("Error in getAccountLedger controller:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
