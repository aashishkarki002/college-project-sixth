/**
 * Calculate aggregated financial totals from unit financials
 */
export const calculateFinancialTotals = (unitFinancials = {}) => {
  const totals = Object.values(unitFinancials).reduce(
    (acc, unitFinancial) => {
      const sqft = parseFloat(unitFinancial.sqft) || 0;
      const pricePerSqft = parseFloat(unitFinancial.pricePerSqft) || 0;
      const camPerSqft = parseFloat(unitFinancial.camPerSqft) || 0;
      const securityDeposit = parseFloat(unitFinancial.securityDeposit) || 0;

      acc.totalSqft += sqft;
      acc.totalPricePerSqft += pricePerSqft;
      acc.totalCamPerSqft += camPerSqft;
      acc.totalSecurityDeposit += securityDeposit;

      return acc;
    },
    {
      totalSqft: 0,
      totalPricePerSqft: 0,
      totalCamPerSqft: 0,
      totalSecurityDeposit: 0,
    },
  );

  return totals;
};

/**
 * Calculate average rates across units
 */
export const calculateAverageRates = (totals, unitCount) => {
  if (unitCount === 0) {
    return {
      avgPricePerSqft: 0,
      avgCamPerSqft: 0,
    };
  }

  return {
    avgPricePerSqft: totals.totalPricePerSqft / unitCount,
    avgCamPerSqft: totals.totalCamPerSqft / unitCount,
  };
};

/**
 * Calculate rent breakdown for display
 */
export const calculateRentBreakdown = (unitFinancials) => {
  return Object.entries(unitFinancials).reduce(
    (acc, [unitId, financial]) => {
      const sqft = parseFloat(financial.sqft) || 0;
      const pricePerSqft = parseFloat(financial.pricePerSqft) || 0;
      const camPerSqft = parseFloat(financial.camPerSqft) || 0;
      const securityDeposit = parseFloat(financial.securityDeposit) || 0;

      acc.totalSqft += sqft;
      acc.grossMonthlyRent += sqft * pricePerSqft;
      acc.monthlyCAM += sqft * camPerSqft;
      acc.totalSecurityDeposit += securityDeposit;

      return acc;
    },
    {
      totalSqft: 0,
      grossMonthlyRent: 0,
      monthlyCAM: 0,
      totalSecurityDeposit: 0,
    },
  );
};
