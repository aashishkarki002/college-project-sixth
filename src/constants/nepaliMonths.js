/**
 * Nepali calendar months (Bikram Sambat) - 1-based index (1 = Baisakh, 12 = Chaitra)
 */
export const NEPALI_MONTHS = [
  { value: 1, label: "Baisakh" },
  { value: 2, label: "Jestha" },
  { value: 3, label: "Ashadh" },
  { value: 4, label: "Shrawan" },
  { value: 5, label: "Bhadra" },
  { value: 6, label: "Ashwin" },
  { value: 7, label: "Kartik" },
  { value: 8, label: "Mangsir" },
  { value: 9, label: "Poush" },
  { value: 10, label: "Magh" },
  { value: 11, label: "Falgun" },
  { value: 12, label: "Chaitra" },
];

import NepaliDate from "nepali-datetime";

/**
 * Get current Nepali month (1-12) and year for default filter values
 */
export const getCurrentNepaliMonthYear = () => {
  try {
    const now = new NepaliDate();
    return {
      month: now.getMonth() + 1, // 0-based in lib, we use 1-based
      year: now.getYear(),
    };
  } catch {
    return { month: 1, year: 2081 };
  }
};
