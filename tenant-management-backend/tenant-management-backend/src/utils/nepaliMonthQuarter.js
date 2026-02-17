/**
 * Returns nepali month numbers (1-12) for a given quarter (1-4).
 * Using numbers avoids casting issues in Mongo queries where nepaliMonth is stored as Number.
 */
export const getMonthsInQuarter = (quarter) => {
  const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1); // [1..12]

  const startIndex = (Number(quarter) - 1) * 3;
  const months = monthNumbers.slice(startIndex, startIndex + 3);
  return months.length ? months : [];
};