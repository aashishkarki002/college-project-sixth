// utils/nepaliDateHelper.js
import NepaliDate from "nepali-datetime";

/**
 * Nepali Date Helper Utilities
 *
 * Industry standards applied:
 * - Input validation with descriptive errors
 * - Explicit timezone handling (Nepal = UTC+5:45)
 * - Defensive programming with try-catch
 * - Pure functions (no side effects)
 * - JSDoc types for IDE autocomplete
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const NEPAL_TIMEZONE_OFFSET = 5.75 * 60 * 60 * 1000; // UTC+5:45 in milliseconds
const NEPALI_MONTHS = 12; // 0-11 for API
const NEPALI_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate Nepali date components
 * @private
 */
function validateNepaliDate(year, month, day) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(
      `Invalid Nepali year: ${year}. Must be integer between 2000-2100`
    );
  }

  if (!Number.isInteger(month) || month < 0 || month >= NEPALI_MONTHS) {
    throw new Error(
      `Invalid Nepali month: ${month}. Must be 0-11 (0-based index)`
    );
  }

  const maxDay = NepaliDate.getDaysOfMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    throw new Error(
      `Invalid day ${day} for ${NEPALI_MONTH_NAMES[month]} ${year}. Valid range: 1-${maxDay}`
    );
  }
}

/**
 * Validate NepaliDate instance
 * @private
 */
function validateNepaliDateInstance(npDate) {
  if (!(npDate instanceof NepaliDate)) {
    throw new TypeError("Expected NepaliDate instance");
  }
}

/**
 * Validate integer input
 * @private
 */
function validateInteger(value, name, { min, max } = {}) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, got ${typeof value}`);
  }
  if (min !== undefined && value < min) {
    throw new RangeError(`${name} must be >= ${min}, got ${value}`);
  }
  if (max !== undefined && value > max) {
    throw new RangeError(`${name} must be <= ${max}, got ${value}`);
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format NepaliDate as ISO-like string (YYYY-MM-DD)
 * @param {NepaliDate} npDate - NepaliDate instance
 * @returns {string} Formatted string like "2081-09-15"
 * @throws {TypeError} If npDate is not NepaliDate instance
 */
function formatNepaliISO(npDate) {
  validateNepaliDateInstance(npDate);

  const year = npDate.getYear();
  const month = String(npDate.getMonth() + 1).padStart(2, "0"); // Convert to 1-based
  const day = String(npDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO-like Nepali date string to NepaliDate
 * @param {string} isoString - Format "YYYY-MM-DD" (1-based month)
 * @returns {NepaliDate}
 * @throws {Error} If format is invalid
 */
function parseNepaliISO(isoString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString);
  if (!match) {
    throw new Error(
      `Invalid Nepali ISO format: "${isoString}". Expected YYYY-MM-DD`
    );
  }

  const year = parseInt(match[1], 10);
  const month1Based = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const month0Based = month1Based - 1;

  validateNepaliDate(year, month0Based, day);
  return new NepaliDate(year, month0Based, day);
}

// ============================================================================
// DATE ARITHMETIC
// ============================================================================

/**
 * Add days to a Nepali date (handles month/year overflow correctly)
 *
 * Industry standard: Uses library's built-in conversion instead of manual loop
 *
 * @param {NepaliDate} npDate - Base Nepali date
 * @param {number} days - Days to add (can be negative)
 * @returns {NepaliDate} New NepaliDate instance
 * @throws {TypeError} If inputs are invalid
 */
function addNepaliDays(npDate, days) {
  validateNepaliDateInstance(npDate);
  validateInteger(days, "days");

  try {
    // Convert to English Date, add days, convert back
    // This is more reliable than manual Nepali calendar arithmetic
    const englishDate = npDate.getDateObject();
    englishDate.setDate(englishDate.getDate() + days);

    // Create new NepaliDate from modified English date
    return new NepaliDate(englishDate);
  } catch (error) {
    throw new Error(
      `Failed to add ${days} days to ${formatNepaliISO(npDate)}: ${
        error.message
      }`
    );
  }
}

/**
 * Add months to a Nepali date (handles overflow correctly)
 *
 * @param {NepaliDate} npDate - Base Nepali date
 * @param {number} months - Months to add (can be negative)
 * @returns {NepaliDate} New NepaliDate instance
 * @throws {TypeError} If inputs are invalid
 */
function addNepaliMonths(npDate, months) {
  validateNepaliDateInstance(npDate);
  validateInteger(months, "months");

  let year = npDate.getYear();
  let month = npDate.getMonth(); // 0-based
  let day = npDate.getDate();

  // Handle negative months
  const totalMonths = month + months;
  const yearOffset = Math.floor(totalMonths / NEPALI_MONTHS);
  let newMonth = totalMonths % NEPALI_MONTHS;

  // Handle negative modulo
  if (newMonth < 0) {
    newMonth += NEPALI_MONTHS;
    year += yearOffset - 1;
  } else {
    year += yearOffset;
  }

  // Clamp day to valid range for new month
  const maxDay = NepaliDate.getDaysOfMonth(year, newMonth);
  const newDay = Math.min(day, maxDay);

  validateNepaliDate(year, newMonth, newDay);
  return new NepaliDate(year, newMonth, newDay);
}

/**
 * Calculate difference in days between two Nepali dates
 * @param {NepaliDate} npDate1 - First date
 * @param {NepaliDate} npDate2 - Second date
 * @returns {number} Days difference (positive if npDate2 is later)
 */
function diffNepaliDays(npDate1, npDate2) {
  validateNepaliDateInstance(npDate1);
  validateNepaliDateInstance(npDate2);

  const date1 = npDate1.getDateObject();
  const date2 = npDate2.getDateObject();

  const diffMs = date2.getTime() - date1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// MONTH UTILITIES
// ============================================================================

/**
 * Get comprehensive month information for a given Nepali month
 *
 * @param {number} [year] - Nepali year (defaults to current)
 * @param {number} [month] - 0-based month index (defaults to current)
 * @returns {Object} Month metadata and date ranges
 * @property {NepaliDate} firstDay - First day of month
 * @property {NepaliDate} lastDay - Last day of month
 * @property {NepaliDate} reminderDay - 7 days before month end
 * @property {NepaliDate} nepaliToday - Current Nepali date
 * @property {Date} firstDayDate - English Date for first day
 * @property {Date} lastDayEndDate - English Date for day after last (exclusive range)
 * @property {Date} nepaliTodayDate - English Date for today
 * @property {number} npYear - Nepali year (4 digits)
 * @property {number} npMonth - Nepali month (1-based, for DB storage)
 * @property {string} nepaliMonthName - Month name in English
 * @throws {TypeError} If year/month are invalid
 */
function getNepaliMonthDates(year, month) {
  const now = new NepaliDate();

  const npYear = year !== undefined ? year : now.getYear();
  const npMonth0 = month !== undefined ? month : now.getMonth();

  validateNepaliDate(npYear, npMonth0, 1);

  const npMonth1Based = npMonth0 + 1; // For database storage
  const lastDayNumber = NepaliDate.getDaysOfMonth(npYear, npMonth0);
  const reminderDayNumber = Math.max(1, lastDayNumber - 7);

  // Create key dates
  const firstDay = new NepaliDate(npYear, npMonth0, 1);
  const lastDay = new NepaliDate(npYear, npMonth0, lastDayNumber);
  const reminderDay = new NepaliDate(npYear, npMonth0, reminderDayNumber);
  const nepaliToday = new NepaliDate(
    now.getYear(),
    now.getMonth(),
    now.getDate()
  );

  // English date conversions (for MongoDB queries)
  const firstDayDate = firstDay.getDateObject();
  const lastDayEndDate = addNepaliDays(lastDay, 1).getDateObject(); // Exclusive end
  const nepaliTodayDate = nepaliToday.getDateObject();

  // Current English date info
  const englishNow = new Date();
  const englishMonth = englishNow.getMonth() + 1; // 1-based
  const englishYear = englishNow.getFullYear();

  return {
    // Nepali dates
    nepaliToday,
    firstDay,
    lastDay,
    reminderDay,

    // Nepali metadata
    npYear,
    npMonth: npMonth1Based, // 1-based for DB
    nepaliMonthName: NEPALI_MONTH_NAMES[npMonth0],

    // Nepali ISO strings (human-readable)
    nepaliDate: now.toString(),
    firstDayNepali: formatNepaliISO(firstDay),
    lastDayNepali: formatNepaliISO(lastDay),
    reminderDayNepali: formatNepaliISO(reminderDay),

    // English date objects (for MongoDB)
    nepaliTodayDate,
    firstDayDate,
    lastDayEndDate, // Use with $lt for exclusive range

    // English ISO strings
    englishDate: now.formatEnglishDate("YYYY-MM-DD"),
    firstDayEnglish: firstDay.formatEnglishDate("YYYY-MM-DD"),
    lastDayEnglish: lastDay.formatEnglishDate("YYYY-MM-DD"),
    reminderDayEnglish: reminderDay.formatEnglishDate("YYYY-MM-DD"),
    englishDueDate: lastDay.formatEnglishDate("YYYY-MM-DD"),

    // English metadata
    englishMonth,
    englishYear,
  };
}

// ============================================================================
// RENT/BILLING CYCLE UTILITIES
// ============================================================================

/**
 * Calculate rent cycle dates based on Nepali calendar
 *
 * @param {Object} params
 * @param {number} params.startYear - Nepali year (4 digits)
 * @param {number} params.startMonth - Nepali month (1-based, as stored in DB)
 * @param {number} [params.frequencyMonths=3] - Billing cycle in months
 * @returns {Object} Rent cycle information
 * @property {string} rentStartNp - Start date in Nepali ISO format
 * @property {string} rentDueNp - Due date in Nepali ISO format
 * @property {Date} rentStartDate - Start date (English Date for DB)
 * @property {Date} rentDueDate - Due date (English Date for DB)
 * @property {number} nepaliStartYear - Start year (Nepali)
 * @property {number} nepaliStartMonth - Start month (1-based, for DB)
 * @property {number} nepaliDueYear - Due year (Nepali)
 * @property {number} nepaliDueMonth - Due month (1-based, for DB)
 * @throws {TypeError} If inputs are invalid
 */
function getRentCycleDates({
  startYear,
  startMonth, // 1-based (from database)
  frequencyMonths = 3,
}) {
  validateInteger(startYear, "startYear", { min: 2000, max: 2100 });
  validateInteger(startMonth, "startMonth", { min: 1, max: 12 });
  validateInteger(frequencyMonths, "frequencyMonths", { min: 1 });

  // Convert to 0-based for NepaliDate API
  const startMonth0Based = startMonth - 1;
  validateNepaliDate(startYear, startMonth0Based, 1);

  const startNp = new NepaliDate(startYear, startMonth0Based, 1);
  const dueNp = addNepaliMonths(startNp, frequencyMonths);

  return {
    // Nepali ISO strings (human-readable)
    rentStartNp: formatNepaliISO(startNp),
    rentDueNp: formatNepaliISO(dueNp),

    // English Dates (MongoDB-safe)
    rentStartDate: startNp.getDateObject(),
    rentDueDate: dueNp.getDateObject(),

    // Nepali metadata (1-based for DB storage)
    nepaliStartYear: startNp.getYear(),
    nepaliStartMonth: startNp.getMonth() + 1, // Convert back to 1-based

    nepaliDueYear: dueNp.getYear(),
    nepaliDueMonth: dueNp.getMonth() + 1, // Convert back to 1-based
  };
}

// ============================================================================
// SPECIAL DAY CHECKS
// ============================================================================

/**
 * Check if today is a special day in the Nepali calendar
 * (first day, reminder day, or last day of month)
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceTest=false] - Return all true for testing
 * @returns {Object} Boolean flags for special days
 * @property {boolean} isFirstDay - True if today is first of month
 * @property {boolean} isReminderDay - True if today is 7 days before month end
 * @property {boolean} isLastDay - True if today is last of month
 */
function checkNepaliSpecialDays({ forceTest = false } = {}) {
  if (forceTest) {
    return {
      isFirstDay: true,
      isReminderDay: true,
      isLastDay: true,
    };
  }

  const now = new NepaliDate();
  const { firstDay, reminderDay, lastDay } = getNepaliMonthDates();

  const isSameDay = (date1, date2) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getYear() === date2.getYear();

  return {
    isFirstDay: isSameDay(now, firstDay),
    isReminderDay: isSameDay(now, reminderDay),
    isLastDay: isSameDay(now, lastDay),
  };
}

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get current time in Nepal timezone
 * Industry standard: Always specify timezone explicitly
 *
 * @returns {Date} Current Nepal time as Date object
 */
function getNepalTime() {
  const utcNow = new Date();
  const nepalTime = new Date(utcNow.getTime() + NEPAL_TIMEZONE_OFFSET);
  return nepalTime;
}

/**
 * Create Date object at midnight Nepal time for a given Nepali date
 * Useful for database queries
 *
 * @param {NepaliDate} npDate - Nepali date
 * @returns {Date} Date at 00:00:00 Nepal time
 */
function toNepalMidnight(npDate) {
  validateNepaliDateInstance(npDate);

  const englishDate = npDate.getDateObject();

  // Set to midnight Nepal time
  const year = englishDate.getFullYear();
  const month = englishDate.getMonth();
  const day = englishDate.getDate();

  const midnight = new Date(Date.UTC(year, month, day));
  midnight.setTime(midnight.getTime() - NEPAL_TIMEZONE_OFFSET);

  return midnight;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core utilities
  getNepaliMonthDates,
  checkNepaliSpecialDays,

  // Date arithmetic
  addNepaliDays,
  addNepaliMonths,
  diffNepaliDays,

  // Formatting
  formatNepaliISO,
  parseNepaliISO,

  // Business logic
  getRentCycleDates,

  // Timezone
  getNepalTime,
  toNepalMidnight,

  // Constants
  NEPALI_MONTH_NAMES,
};
