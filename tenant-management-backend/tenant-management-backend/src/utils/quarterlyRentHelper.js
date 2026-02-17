import NepaliDate from "nepali-datetime";
import {
  addNepaliMonths,
  formatNepaliISO,
  getNepaliMonthDates,
} from "./nepaliDateHelper.js";

/**
 * Quarterly Rent Cycle Helper
 *
 * Industry standards:
 * - Quarterly periods: 3 months (standard business practice)
 * - Nepali fiscal quarters align with calendar quarters
 * - MongoDB date queries use Date objects (not strings)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const QUARTERLY_MONTHS = 3;
const NEPALI_QUARTERS = [
  {
    quarter: 1,
    months: [1, 2, 3],
    name: "Q1",
    nepaliMonths: ["Baisakh", "Jestha", "Ashadh"],
  },
  {
    quarter: 2,
    months: [4, 5, 6],
    name: "Q2",
    nepaliMonths: ["Shrawan", "Bhadra", "Ashwin"],
  },
  {
    quarter: 3,
    months: [7, 8, 9],
    name: "Q3",
    nepaliMonths: ["Kartik", "Mangsir", "Poush"],
  },
  {
    quarter: 4,
    months: [10, 11, 12],
    name: "Q4",
    nepaliMonths: ["Magh", "Falgun", "Chaitra"],
  },
];

// ============================================================================
// QUARTER UTILITIES
// ============================================================================

/**
 * Get quarter number from 1-based month
 * @param {number} month1Based - Nepali month (1-12)
 * @returns {number} Quarter (1-4)
 */
function getQuarterFromMonth(month1Based) {
  if (month1Based < 1 || month1Based > 12) {
    throw new Error(`Invalid month: ${month1Based}. Must be 1-12`);
  }
  return Math.ceil(month1Based / 3);
}

/**
 * Get quarter information for a given month
 * @param {number} month1Based - Nepali month (1-12)
 * @returns {Object} Quarter metadata
 */
function getQuarterInfo(month1Based) {
  const quarter = getQuarterFromMonth(month1Based);
  return NEPALI_QUARTERS[quarter - 1];
}

/**
 * Get all months in a specific quarter
 * @param {number} quarter - Quarter number (1-4)
 * @returns {number[]} Array of months (1-based)
 */
function getMonthsInQuarter(quarter) {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}. Must be 1-4`);
  }
  return NEPALI_QUARTERS[quarter - 1].months;
}

// ============================================================================
// QUARTERLY RENT CYCLE CALCULATION
// ============================================================================

/**
 * Calculate quarterly rent cycle dates
 *
 * Example: Start 2082-10-01 (Magh 1) → Due 2083-01-01 (Baisakh 1)
 *
 * @param {Object} params
 * @param {number} params.startYear - Nepali year
 * @param {number} params.startMonth - Nepali month (1-based, from DB)
 * @param {number} [params.startDay=1] - Day of month (default: 1st)
 * @returns {Object} Quarterly rent cycle information
 */
function calculateQuarterlyRentCycle({ startYear, startMonth, startDay = 1 }) {
  // Validate inputs
  if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) {
    throw new Error(`Invalid year: ${startYear}`);
  }
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new Error(`Invalid month: ${startMonth}`);
  }

  // Convert to 0-based for NepaliDate API
  const startMonth0Based = startMonth - 1;

  // Create start date (charge date)
  const chargeDate = new NepaliDate(startYear, startMonth0Based, startDay);

  // Calculate due date (3 months later, first day)
  const dueDate = addNepaliMonths(chargeDate, QUARTERLY_MONTHS);
  const dueDateFirstDay = new NepaliDate(
    dueDate.getYear(),
    dueDate.getMonth(),
    1
  );

  // Get quarter information
  const startQuarter = getQuarterFromMonth(startMonth);
  const dueMonth1Based = dueDate.getMonth() + 1;
  const dueQuarter = getQuarterFromMonth(dueMonth1Based);

  return {
    // Charge period (current quarter)
    chargeDate: {
      nepali: formatNepaliISO(chargeDate),
      english: chargeDate.getDateObject(),
      year: chargeDate.getYear(),
      month: startMonth, // 1-based
      quarter: startQuarter,
    },

    // Due date (next quarter start)
    dueDate: {
      nepali: formatNepaliISO(dueDateFirstDay),
      english: dueDateFirstDay.getDateObject(),
      year: dueDateFirstDay.getYear(),
      month: dueMonth1Based, // 1-based
      quarter: dueQuarter,
    },

    // Coverage period (which 3 months this rent covers)
    coverageMonths: [startMonth, startMonth + 1, startMonth + 2].map((m) =>
      m > 12 ? m - 12 : m
    ),
    coverageQuarter: startQuarter,

    // Payment window
    paymentWindowDays: 0, // Due on first day of next quarter
  };
}

// ============================================================================
// NEXT RENT CYCLE CALCULATION
// ============================================================================

/**
 * Calculate next quarterly rent charge based on last charge date
 *
 * @param {Object} params
 * @param {Date} params.lastChargeDate - Last rent charge date (English Date)
 * @param {number} [params.frequencyMonths=3] - Billing frequency
 * @returns {Object} Next rent cycle details
 */
function calculateNextQuarterlyRent({ lastChargeDate, frequencyMonths = 3 }) {
  if (!(lastChargeDate instanceof Date)) {
    throw new TypeError("lastChargeDate must be a Date object");
  }

  // Convert to Nepali date
  const lastChargeNepali = new NepaliDate(lastChargeDate);

  // Add frequency months to get next charge date
  const nextChargeNepali = addNepaliMonths(lastChargeNepali, frequencyMonths);

  // Calculate cycle from next charge date
  return calculateQuarterlyRentCycle({
    startYear: nextChargeNepali.getYear(),
    startMonth: nextChargeNepali.getMonth() + 1, // Convert to 1-based
    startDay: nextChargeNepali.getDate(),
  });
}

// ============================================================================
// FILTERING UTILITIES (FOR MONGODB QUERIES)
// ============================================================================

/**
 * Build MongoDB query filter for rents in a specific Nepali quarter
 *
 * @param {Object} params
 * @param {number} params.year - Nepali year
 * @param {number} params.quarter - Quarter (1-4)
 * @returns {Object} MongoDB query filter
 */
function buildQuarterFilter({ year, quarter }) {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}`);
  }

  const months = getMonthsInQuarter(quarter);

  return {
    nepaliYear: year,
    nepaliMonth: { $in: months },
  };
}

/**
 * Build MongoDB query filter for rents in a specific Nepali month
 *
 * @param {Object} params
 * @param {number} params.year - Nepali year
 * @param {number} params.month - Month (1-12)
 * @returns {Object} MongoDB query filter
 */
function buildMonthFilter({ year, month }) {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }

  return {
    nepaliYear: year,
    nepaliMonth: month,
  };
}

/**
 * Build MongoDB query filter for rents due in a specific date range
 *
 * Industry standard: Use Date objects + $gte/$lt for inclusive/exclusive ranges
 *
 * @param {Object} params
 * @param {Date} params.startDate - Start date (inclusive, English Date)
 * @param {Date} params.endDate - End date (exclusive, English Date)
 * @returns {Object} MongoDB query filter
 */
function buildDueDateRangeFilter({ startDate, endDate }) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new TypeError("startDate and endDate must be Date objects");
  }

  return {
    nepaliDueDate: {
      $gte: startDate, // Inclusive start
      $lt: endDate, // Exclusive end
    },
  };
}

/**
 * Build comprehensive filter for quarterly rent queries
 *
 * @param {Object} params
 * @param {number} [params.year] - Nepali year
 * @param {number} [params.quarter] - Quarter (1-4)
 * @param {number} [params.month] - Month (1-12)
 * @param {Date} [params.dueDateStart] - Due date range start
 * @param {Date} [params.dueDateEnd] - Due date range end
 * @param {string} [params.status] - Rent status
 * @param {string} [params.tenantId] - Tenant ObjectId
 * @returns {Object} MongoDB query filter
 */
function buildQuarterlyRentFilter({
  year,
  quarter,
  month,
  dueDateStart,
  dueDateEnd,
  status,
  tenantId,
}) {
  const filter = {};

  // Tenant filter
  if (tenantId) {
    filter.tenant = tenantId;
  }

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Quarter filter (takes precedence over month)
  if (year && quarter) {
    Object.assign(filter, buildQuarterFilter({ year, quarter }));
  } else if (year && month) {
    Object.assign(filter, buildMonthFilter({ year, month }));
  } else if (year) {
    filter.nepaliYear = year;
  }

  // Due date range filter
  if (dueDateStart && dueDateEnd) {
    Object.assign(
      filter,
      buildDueDateRangeFilter({ startDate: dueDateStart, endDate: dueDateEnd })
    );
  }

  return filter;
}

// ============================================================================
// CURRENT QUARTER HELPERS
// ============================================================================

/**
 * Get current quarter information based on today's Nepali date
 *
 * @returns {Object} Current quarter details
 */
function getCurrentQuarterInfo() {
  const { npYear, npMonth } = getNepaliMonthDates();
  const quarter = getQuarterFromMonth(npMonth);
  const quarterInfo = getQuarterInfo(npMonth);

  return {
    year: npYear,
    month: npMonth,
    quarter,
    quarterName: quarterInfo.name,
    quarterMonths: quarterInfo.months,
    quarterNepaliNames: quarterInfo.nepaliMonths,
  };
}

/**
 * Check if a given date falls in the current Nepali quarter
 *
 * @param {Date} date - English Date to check
 * @returns {boolean}
 */
function isInCurrentQuarter(date) {
  if (!(date instanceof Date)) {
    throw new TypeError("date must be a Date object");
  }

  const npDate = new NepaliDate(date);
  const current = getCurrentQuarterInfo();

  return (
    npDate.getYear() === current.year &&
    current.quarterMonths.includes(npDate.getMonth() + 1)
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Quarter utilities
  getQuarterFromMonth,
  getQuarterInfo,
  getMonthsInQuarter,
  getCurrentQuarterInfo,
  isInCurrentQuarter,

  // Rent cycle calculations
  calculateQuarterlyRentCycle,
  calculateNextQuarterlyRent,

  // MongoDB filtering
  buildQuarterFilter,
  buildMonthFilter,
  buildDueDateRangeFilter,
  buildQuarterlyRentFilter,

  // Constants
  QUARTERLY_MONTHS,
  NEPALI_QUARTERS,
};
