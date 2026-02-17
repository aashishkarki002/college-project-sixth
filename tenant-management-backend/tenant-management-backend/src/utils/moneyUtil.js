/**
 * MONEY UTILITY - Industry Standard Money Handling
 *
 * Standards followed:
 * - Store money as INTEGER paisa (1 rupee = 100 paisa)
 * - All calculations in paisa (integer arithmetic)
 * - Round using Banker's Rounding (IEEE 754) to avoid bias
 * - Convert to rupees only for display
 *
 * Inspired by: Stripe API, Dinero.js, Java Money API
 */

const PAISA_PER_RUPEE = 100;

/**
 * Banker's Rounding (Round Half to Even)
 * Industry standard to avoid cumulative rounding bias
 *
 * Examples:
 * 2.5 → 2 (even)
 * 3.5 → 4 (even)
 * 2.51 → 3
 */
function bankersRound(value) {
  const rounded = Math.round(value);
  const difference = Math.abs(value - rounded);

  // If exactly 0.5, round to nearest even
  if (difference === 0.5) {
    return rounded % 2 === 0 ? rounded : Math.floor(value);
  }

  return rounded;
}

/**
 * Extract numeric value from formatted string or number
 * Handles formatted strings like "Rs. 27,272.70" or "27,272.70"
 * @param {number|string} value - Amount (formatted string or number)
 * @returns {number} Numeric value
 */
function extractNumericValue(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    // Remove currency symbols, spaces, and commas
    const cleaned = value.replace(/[Rs.\s,]/gi, "").trim();
    const num = Number(cleaned);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }
    return num;
  }
  throw new Error(`Invalid value type: ${typeof value}, value: ${value}`);
}

/**
 * Convert rupees (float or numeric string) to paisa (integer)
 * Handles formatted strings like "Rs. 27,272.70" or plain numbers
 * @param {number|string} rupees - Amount in rupees
 * @returns {number} Amount in paisa (integer)
 */
export function rupeesToPaisa(rupees) {
  const num = extractNumericValue(rupees);
  return bankersRound(num * PAISA_PER_RUPEE);
}

/**
 * Convert paisa (integer) to rupees (float)
 * @param {number} paisa - Amount in paisa
 * @returns {number} Amount in rupees (2 decimal places)
 */
export function paisaToRupees(paisa) {
  // Handle undefined/null values gracefully
  if (paisa === undefined || paisa === null) {
    return 0;
  }
  if (!Number.isInteger(paisa)) {
    throw new Error(`Paisa must be integer, got: ${paisa}`);
  }
  return paisa / PAISA_PER_RUPEE;
}

/**
 * Format paisa as rupee string for display
 * @param {number} paisa - Amount in paisa (integer)
 * @param {object} options - Formatting options
 * @returns {string} Formatted string (e.g., "Rs. 27,272.73")
 */
export function formatMoney(paisa, options = {}) {
  const {
    symbol = "Rs.",
    showSymbol = true,
    decimals = 2,
    locale = "en-NP", // Nepal locale
  } = options;

  const rupees = paisaToRupees(paisa);
  const formatted = rupees.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `${symbol} ${formatted}` : formatted;
}

/**
 * Add two money amounts (in paisa)
 * @param {number} paisa1 - First amount in paisa
 * @param {number} paisa2 - Second amount in paisa
 * @returns {number} Sum in paisa
 */
export function addMoney(paisa1, paisa2) {
  return paisa1 + paisa2;
}

/**
 * Subtract two money amounts (in paisa)
 * @param {number} paisa1 - First amount in paisa
 * @param {number} paisa2 - Second amount in paisa
 * @returns {number} Difference in paisa
 */
export function subtractMoney(paisa1, paisa2) {
  return paisa1 - paisa2;
}

/**
 * Multiply money by a number (e.g., quantity, percentage)
 * @param {number} paisa - Amount in paisa
 * @param {number} multiplier - Multiplier (can be float)
 * @returns {number} Product in paisa (rounded)
 */
export function multiplyMoney(paisa, multiplier) {
  return bankersRound(paisa * multiplier);
}

/**
 * Divide money by a number
 * @param {number} paisa - Amount in paisa
 * @param {number} divisor - Divisor
 * @returns {number} Quotient in paisa (rounded)
 */
export function divideMoney(paisa, divisor) {
  if (divisor === 0) {
    throw new Error("Cannot divide by zero");
  }
  return bankersRound(paisa / divisor);
}

/**
 * Calculate percentage of money amount
 * @param {number} paisa - Base amount in paisa
 * @param {number} percentage - Percentage (e.g., 10 for 10%)
 * @returns {number} Percentage amount in paisa
 */
export function percentageOf(paisa, percentage) {
  return multiplyMoney(paisa, percentage / 100);
}

/**
 * Distribute money amount across multiple parts
 * Handles remainder distribution fairly (largest remainder method)
 *
 * @param {number} totalPaisa - Total amount to distribute
 * @param {number} parts - Number of parts
 * @returns {number[]} Array of paisa amounts
 *
 * @example
 * distributeMoney(10000, 3) // [3334, 3333, 3333] (Rs. 100 → 3 parts)
 */
export function distributeMoney(totalPaisa, parts) {
  if (parts <= 0) {
    throw new Error("Parts must be positive");
  }

  const baseAmount = Math.floor(totalPaisa / parts);
  const remainder = totalPaisa % parts;

  const distribution = Array(parts).fill(baseAmount);

  // Distribute remainder to first N parts
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }

  return distribution;
}

/**
 * Distribute money proportionally by weights
 * @param {number} totalPaisa - Total amount to distribute
 * @param {number[]} weights - Weight for each part
 * @returns {number[]} Array of paisa amounts
 *
 * @example
 * distributeByWeight(10000, [1, 2, 1]) // [2500, 5000, 2500]
 */
export function distributeByWeight(totalPaisa, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const portions = weights.map((weight) =>
    Math.floor((weight / totalWeight) * totalPaisa),
  );

  // Handle rounding remainder
  const distributed = portions.reduce((sum, p) => sum + p, 0);
  const remainder = totalPaisa - distributed;

  // Give remainder to largest portion
  if (remainder > 0) {
    const maxIndex = portions.indexOf(Math.max(...portions));
    portions[maxIndex] += remainder;
  }

  return portions;
}

/**
 * Money object with chainable operations
 * @param {number} paisa - Initial amount in paisa
 */
export class Money {
  constructor(paisa) {
    if (!Number.isInteger(paisa)) {
      throw new Error(
        `Money must be initialized with integer paisa, got: ${paisa}`,
      );
    }
    this.paisa = paisa;
  }

  static fromRupees(rupees) {
    return new Money(rupeesToPaisa(rupees));
  }

  toRupees() {
    return paisaToRupees(this.paisa);
  }

  format(options) {
    return formatMoney(this.paisa, options);
  }

  add(other) {
    const amount = other instanceof Money ? other.paisa : other;
    return new Money(this.paisa + amount);
  }

  subtract(other) {
    const amount = other instanceof Money ? other.paisa : other;
    return new Money(this.paisa - amount);
  }

  multiply(multiplier) {
    return new Money(multiplyMoney(this.paisa, multiplier));
  }

  divide(divisor) {
    return new Money(divideMoney(this.paisa, divisor));
  }

  percentage(percent) {
    return new Money(percentageOf(this.paisa, percent));
  }

  isGreaterThan(other) {
    const amount = other instanceof Money ? other.paisa : other;
    return this.paisa > amount;
  }

  isLessThan(other) {
    const amount = other instanceof Money ? other.paisa : other;
    return this.paisa < amount;
  }

  equals(other) {
    const amount = other instanceof Money ? other.paisa : other;
    return this.paisa === amount;
  }

  toJSON() {
    return this.paisa;
  }
}

export default {
  rupeesToPaisa,
  paisaToRupees,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  percentageOf,
  distributeMoney,
  distributeByWeight,
  Money,
};
