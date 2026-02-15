// utils/date.js
import dateConverter from "nepali-datetime/dateConverter";

/**
 * Nepali month names in order (0-indexed: 0-11)
 */
const nepaliMonths = [
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

/**
 * Converts an English date (ISO string, Date object, or YYYY-MM-DD) to Nepali date string with month name
 * @param {string|Date} englishDate
 * @returns {string} Nepali date in "DD Month YYYY" format, e.g., "19 Poush 2083"
 */
export function toNepaliDate(englishDate) {
  if (!englishDate) return "N/A";

  let year, month, day;

  if (englishDate instanceof Date) {
    year = englishDate.getFullYear();
    month = englishDate.getMonth(); // Keep as 0-indexed (0-11) for dateConverter
    day = englishDate.getDate();
  } else if (typeof englishDate === "string") {
    const datePart = englishDate.slice(0, 10); // "2026-01-31"
    const parts = datePart.split("-").map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) return "N/A";

    [year, month, day] = parts;
    month = month - 1; // Convert to 0-indexed (1-12 -> 0-11) for dateConverter
  } else {
    return "N/A";
  }

  // Validate date range (nepali-datetime typically supports 1944-2033)
  // Some versions may have stricter limits, so we'll also catch the error below
  if (year < 1944 || year > 2033) {
    console.warn(
      `Date out of supported range (1944-2033): ${year}`,
      englishDate
    );
    return "N/A";
  }

  // Validate month and day
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    console.warn(
      `Invalid date values: year=${year}, month=${month + 1}, day=${day}`,
      englishDate
    );
    return "N/A";
  }

  try {
    // dateConverter.englishToNepali expects 0-indexed month (0-11)
    const [npYear, npMonth, npDay] = dateConverter.englishToNepali(
      year,
      month, // Already 0-indexed (0-11)
      day
    );

    // npMonth from dateConverter is returned as 1-indexed (1-12) for Nepali calendar
    // We need to convert to 0-indexed (0-11) for array access
    const monthIndex = npMonth;

    if (monthIndex < 0 || monthIndex > 11) {
      console.warn(`Invalid Nepali month index: ${npMonth}`, englishDate);
      return "N/A";
    }

    const monthName = nepaliMonths[monthIndex] || "Unknown";

    return `${npDay} ${monthName} ${npYear}`;
  } catch (err) {
    // Handle DateOutOfRangeError and other conversion errors gracefully
    if (
      err.name === "DateOutOfRangeError" ||
      err.message?.includes("out of range")
    ) {
      console.warn(
        `Date out of range for conversion: ${year}-${month + 1}-${day}`,
        englishDate
      );
    } else {
      console.error("Date conversion error:", err.message || err, englishDate);
    }
    return "N/A";
  }
}
