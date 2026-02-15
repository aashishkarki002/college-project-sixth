import NepaliDate from "nepali-datetime";

/**
 * Formats Nepali due date from rent object
 * Priority order:
 * 1. nepaliDueDate (if available)
 * 2. nepaliMonth and nepaliYear
 * 3. month and year (English)
 * 4. englishDueDate
 * 
 * @param {Object} rent - Rent object with date information
 * @returns {string} Formatted Nepali date string or "N/A"
 */
export const formatNepaliDueDate = (rent) => {
  try {
    // Priority 1: Use nepaliDueDate if available (already in Nepali BS format)
    if (rent.nepaliDueDate) {
      const nepaliDateStr = rent.nepaliDueDate.split("T")[0]; // Extract YYYY-MM-DD
      const [year, month, day] = nepaliDateStr.split("-").map(Number);

      // Check if year is in Nepali range (BS years are typically 2000+)
      if (year > 2000) {
        // This is already a Nepali date, create NepaliDate object
        try {
          const nepaliDate = new NepaliDate(year, month - 1, day);
          return nepaliDate.format("YYYY-MMM-DD");
        } catch (e) {
          // If that fails, try with 0-indexed month
          const nepaliDate = new NepaliDate(year, month - 1, day);
          return nepaliDate.format("YYYY-MMM-DD");
        }
      }
    }

    // Priority 2: Use nepaliMonth and nepaliYear if available
    if (rent.nepaliMonth && rent.nepaliYear) {
      // Create NepaliDate directly from Nepali date components
      try {
        const nepaliDate = new NepaliDate(rent.nepaliYear, rent.nepaliMonth, 1);
        return nepaliDate.format("YYYY-MMM");
      } catch (e) {
        // If that fails, try with 0-indexed month
        const nepaliDate = new NepaliDate(
          rent.nepaliYear,
          rent.nepaliMonth - 1,
          1
        );
        return nepaliDate.format("YYYY-MMM");
      }
    }

    // Priority 3: Convert from English month and year
    if (rent.month && rent.year) {
      const dateStr = `${rent.year}-${String(rent.month).padStart(2, "0")}-01`;
      const nepaliDate = NepaliDate.parseEnglishDate(dateStr, "YYYY-MM-DD");
      return nepaliDate.format("YYYY-MMM-DD");
    }

    // Priority 4: Use englishDueDate if available
    if (rent.englishDueDate) {
      const dateStr = rent.englishDueDate.split("T")[0]; // Extract YYYY-MM-DD
      const nepaliDate = NepaliDate.parseEnglishDate(dateStr, "YYYY-MM-DD");
      return nepaliDate.format("YYYY-MMM-DD");
    }

    return "N/A";
  } catch (error) {
    console.error("Error converting date to Nepali:", error);
    // Fallback: show available date info
    if (rent.nepaliDueDate) {
      const dateStr = rent.nepaliDueDate.split("T")[0];
      return dateStr; // Return raw date string as fallback
    }
    if (rent.nepaliMonth - 1 && rent.nepaliYear) {
      return `${rent.nepaliYear}-${String(rent.nepaliMonth).padStart(2, "0")}`;
    }
    if (rent.month - 1 && rent.year) {
      return `${rent.month}/${rent.year}`;
    }
    return "N/A";
  }
};
