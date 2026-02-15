import { NEPALI_MONTHS } from "@/constants/nepaliMonths";

/**
 * Electricity consumption and trend helpers.
 */

/**
 * Get consumption from a record (either stored or prev/curr difference).
 * @param {{ consumption?: number, previousReading?: number, currentReading?: number }} record
 * @returns {number}
 */
export function getConsumption(record) {
  if (record.consumption != null && !Number.isNaN(record.consumption)) {
    return Number(record.consumption);
  }
  const prev = Number(record.previousReading) || 0;
  const curr = Number(record.currentReading) || 0;
  return curr - prev;
}

/**
 * Check if record is flagged (high usage) based on consumption threshold.
 * @param {Object} record
 * @param {number} threshold
 * @returns {boolean}
 */
export function isFlagged(record, threshold = 200) {
  return getConsumption(record) > threshold;
}

/**
 * Trend percentage: (consumption / previousReading - 1) * 100.
 * @param {number} consumption
 * @param {number} previousReading
 * @returns {string} e.g. "+5.2" or "0.0"
 */
export function getTrendPercent(consumption, previousReading) {
  if (!previousReading || previousReading <= 0) return "0.0";
  const ratio = consumption / previousReading;
  return (((ratio - 1) * 100)).toFixed(1);
}

/**
 * Format consumption for display (one decimal).
 * @param {number} value
 * @returns {string}
 */
export function formatConsumption(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Parse "MonthName YYYY" (e.g. "Ashwin 2081") to { month: 1-12, year: number }.
 * Uses NEPALI_MONTHS order (Baisakh=1 ... Chaitra=12).
 * @param {string} str
 * @returns {{ month: number, year: number } | null}
 */
export function parseNepaliMonthString(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\S+)\s+(\d{4})$/);
  if (!match) return null;
  const [, monthName, yearStr] = match;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) return null;
  const monthEntry = NEPALI_MONTHS.find(
    (m) => m.label.toLowerCase() === monthName.toLowerCase()
  );
  if (!monthEntry) return null;
  return { month: monthEntry.value, year };
}
