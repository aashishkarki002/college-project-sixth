/**
 * RENT CALCULATION SERVICE
 * Single source of truth for all rent/lease calculations
 *
 * Philosophy:
 * - Pure functions (no side effects)
 * - Testable in isolation
 * - Reusable across different contexts
 * - Clear input/output contracts
 */

/**
 * Calculate financial metrics for a single unit lease
 *
 * @param {Object} params
 * @param {number} params.sqft - Leased square footage
 * @param {number} params.pricePerSqft - GROSS price per sqft (includes TDS)
 * @param {number} params.camRatePerSqft - CAM rate per sqft
 * @param {number} params.tdsPercentage - TDS percentage (default 10%)
 * @param {number} params.securityDeposit - Security deposit amount
 * @returns {Object} Complete financial breakdown
 */
export function calculateUnitLease({
  sqft,
  pricePerSqft,
  camRatePerSqft,
  tdsPercentage = 10,
  securityDeposit = 0,
}) {
  // Validation
  if (!sqft || sqft <= 0) {
    throw new Error(`Invalid square footage: ${sqft}`);
  }
  if (pricePerSqft < 0) {
    throw new Error(`Invalid price per sqft: ${pricePerSqft}`);
  }
  if (camRatePerSqft < 0) {
    throw new Error(`Invalid CAM rate: ${camRatePerSqft}`);
  }

  const tdsRate = tdsPercentage / 100;

  // TDS Calculation (Reverse method)
  // Given: Gross price includes TDS
  // Formula: TDS = Gross - (Gross / (1 + rate))
  const tdsPerSqft = pricePerSqft - pricePerSqft / (1 + tdsRate);
  const netRatePerSqft = pricePerSqft - tdsPerSqft;

  // Monthly amounts
  const grossMonthly = pricePerSqft * sqft;
  const totalTds = tdsPerSqft * sqft;
  const rentMonthly = netRatePerSqft * sqft; // After TDS
  const camMonthly = camRatePerSqft * sqft;
  const netMonthly = rentMonthly + camMonthly;

  return {
    // Input reference
    sqft,
    pricePerSqft,
    camRatePerSqft,
    securityDeposit,

    // Per sqft rates
    tdsPerSqft,
    netRatePerSqft,

    // Monthly totals
    grossMonthly,
    totalTds,
    rentMonthly,
    camMonthly,
    netMonthly,
  };
}

/**
 * Calculate aggregated lease summary for multiple units
 *
 * @param {Array} unitLeases - Array of unit lease configs
 * @param {number} tdsPercentage - TDS percentage
 * @returns {Object} Aggregated totals and per-unit breakdowns
 */
export function calculateMultiUnitLease(unitLeases, tdsPercentage = 10) {
  if (!Array.isArray(unitLeases) || unitLeases.length === 0) {
    throw new Error("unitLeases must be a non-empty array");
  }

  const totals = {
    sqft: 0,
    grossMonthly: 0,
    rentMonthly: 0,
    camMonthly: 0,
    totalTds: 0,
    securityDeposit: 0,
    netMonthly: 0,
  };

  // Calculate each unit and aggregate
  const unitsWithCalculations = unitLeases.map((unitConfig) => {
    const calc = calculateUnitLease({
      sqft: unitConfig.leasedSquareFeet,
      pricePerSqft: unitConfig.pricePerSqft,
      camRatePerSqft: unitConfig.camRatePerSqft,
      securityDeposit: unitConfig.securityDeposit || 0,
      tdsPercentage,
    });

    // Accumulate totals
    totals.sqft += calc.sqft;
    totals.grossMonthly += calc.grossMonthly;
    totals.rentMonthly += calc.rentMonthly;
    totals.camMonthly += calc.camMonthly;
    totals.totalTds += calc.totalTds;
    totals.securityDeposit += calc.securityDeposit;
    totals.netMonthly += calc.netMonthly;

    return {
      unitId: unitConfig.unitId,
      ...calc,
    };
  });

  // Calculate weighted averages
  const weightedPricePerSqft =
    totals.sqft > 0 ? totals.grossMonthly / totals.sqft : 0;
  const weightedCamRate = totals.sqft > 0 ? totals.camMonthly / totals.sqft : 0;

  return {
    units: unitsWithCalculations,
    totals: {
      ...totals,
      weightedPricePerSqft,
      weightedCamRate,
    },
  };
}

/**
 * Calculate rent amount based on frequency
 *
 * @param {number} monthlyRent - Monthly rent amount
 * @param {string} frequency - "monthly" or "quarterly"
 * @param {number} frequencyMonths - Number of months (for quarterly)
 * @returns {Object} Rent period details
 */
export function calculateRentByFrequency(
  monthlyRent,
  frequency = "monthly",
  frequencyMonths = 3,
) {
  if (frequency === "quarterly") {
    return {
      frequency: "quarterly",
      monthlyAmount: monthlyRent,
      chargeAmount: monthlyRent * frequencyMonths,
      periodMonths: frequencyMonths,
    };
  }

  return {
    frequency: "monthly",
    monthlyAmount: monthlyRent,
    chargeAmount: monthlyRent,
    periodMonths: 1,
  };
}

/**
 * Build unit breakdown for rent record
 * Handles both monthly and quarterly frequencies
 *
 * @param {Array} units - Unit documents from DB
 * @param {Array} calculatedUnits - Pre-calculated unit data
 * @param {string} frequency - Rent frequency
 * @param {number} frequencyMonths - Months for quarterly
 * @returns {Array} Unit breakdown for rent record
 */
export function buildUnitBreakdown(
  units,
  calculatedUnits,
  frequency = "monthly",
  frequencyMonths = 3,
) {
  const multiplier = frequency === "quarterly" ? frequencyMonths : 1;

  return units.map((unit) => {
    const unitCalc = calculatedUnits.find(
      (c) => c.unitId === unit._id.toString(),
    );

    if (!unitCalc) {
      throw new Error(`No calculation found for unit ${unit._id}`);
    }

    return {
      unit: unit._id,
      rentAmount: unitCalc.rentMonthly * multiplier,
      tdsAmount: unitCalc.totalTds * multiplier,
      paidAmount: 0,
      status: "pending",
      pricePerSqft: unitCalc.pricePerSqft,
      sqft: unitCalc.sqft,
      camRate: unitCalc.camRatePerSqft,
    };
  });
}

/**
 * Validate unit lease configuration
 *
 * @param {Object} config - Unit lease config
 * @throws {Error} If validation fails
 */
export function validateUnitLeaseConfig(config) {
  const required = [
    "unitId",
    "leasedSquareFeet",
    "pricePerSqft",
    "camRatePerSqft",
  ];

  for (const field of required) {
    if (config[field] === undefined || config[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (config.leasedSquareFeet <= 0) {
    throw new Error("leasedSquareFeet must be greater than 0");
  }

  if (config.pricePerSqft < 0) {
    throw new Error("pricePerSqft cannot be negative");
  }

  if (config.camRatePerSqft < 0) {
    throw new Error("camRatePerSqft cannot be negative");
  }
}
