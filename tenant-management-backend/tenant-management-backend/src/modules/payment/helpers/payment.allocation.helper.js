/**
 * Allocate payment proportionally across units based on remaining amounts
 *
 * Industry Use: QuickBooks, Stripe Invoicing
 * Benefits: Fair distribution, minimizes disputes
 *
 * @param {Array} unitBreakdown - Array of unit breakdown objects
 * @param {number} totalPaymentPaisa - Total payment amount in paisa
 * @returns {Array} Unit allocations [{unitId, amountPaisa}]
 */
export function allocatePaymentProportionally(
  unitBreakdown,
  totalPaymentPaisa,
) {
  // Calculate total remaining across all units
  const totalRemainingPaisa = unitBreakdown.reduce((sum, unit) => {
    const remaining = (unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  if (totalRemainingPaisa === 0) {
    throw new Error("No remaining balance to allocate payment");
  }

  let remainingToAllocate = totalPaymentPaisa;
  const allocations = [];

  unitBreakdown.forEach((unit, index) => {
    const unitRemaining =
      (unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0);

    if (unitRemaining <= 0) return; // Skip fully paid units

    // Calculate proportional share
    let allocation;
    if (index === unitBreakdown.length - 1) {
      // Last unit gets remainder to avoid rounding errors
      allocation = remainingToAllocate;
    } else {
      allocation = Math.round(
        (unitRemaining / totalRemainingPaisa) * totalPaymentPaisa,
      );
      allocation = Math.min(allocation, unitRemaining); // Don't overpay
    }

    if (allocation > 0) {
      allocations.push({
        unitId: unit.unit,
        amountPaisa: allocation,
      });
      remainingToAllocate -= allocation;
    }
  });

  return allocations;
}

/**
 * Allocate payment using FIFO strategy (First In, First Out)
 *
 * Industry Use: Property management software, lease accounting
 * Benefits: Pays oldest charges first, common in lease agreements
 *
 * @param {Array} unitBreakdown - Array of unit breakdown objects
 * @param {number} totalPaymentPaisa - Total payment amount in paisa
 * @returns {Array} Unit allocations [{unitId, amountPaisa}]
 */
export function allocatePaymentFIFO(unitBreakdown, totalPaymentPaisa) {
  let remainingPayment = totalPaymentPaisa;
  const allocations = [];

  // Sort units by creation date or unit order
  const sortedUnits = [...unitBreakdown].sort((a, b) => {
    // Assuming older units come first in array
    return 0; // Keep original order (can add createdAt sort if needed)
  });

  for (const unit of sortedUnits) {
    if (remainingPayment <= 0) break;

    const unitRemaining =
      (unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0);

    if (unitRemaining <= 0) continue;

    const allocateToUnit = Math.min(remainingPayment, unitRemaining);

    allocations.push({
      unitId: unit.unit,
      amountPaisa: allocateToUnit,
    });

    remainingPayment -= allocateToUnit;
  }

  return allocations;
}

/**
 * Allocate payment to specific units manually
 *
 * Industry Use: All payment systems
 * Benefits: User control, special payment arrangements
 *
 * @param {Array} manualAllocations - User-specified allocations
 * @returns {Array} Normalized unit allocations
 */
export function allocatePaymentManually(manualAllocations) {
  return manualAllocations.map((allocation) => ({
    unitId: allocation.unitId,
    amountPaisa:
      allocation.amountPaisa || Math.round((allocation.amount || 0) * 100),
  }));
}

/**
 * Calculate unit payment summary
 *
 * @param {Array} unitBreakdown - Unit breakdown array
 * @returns {Object} Summary {totalDue, totalPaid, totalRemaining}
 */
export function calculateUnitPaymentSummary(unitBreakdown) {
  const summary = unitBreakdown.reduce(
    (acc, unit) => {
      acc.totalDuePaisa += unit.rentAmountPaisa || 0;
      acc.totalPaidPaisa += unit.paidAmountPaisa || 0;
      acc.totalTdsPaisa += unit.tdsAmountPaisa || 0;
      return acc;
    },
    {
      totalDuePaisa: 0,
      totalPaidPaisa: 0,
      totalTdsPaisa: 0,
    },
  );

  summary.totalRemainingPaisa = summary.totalDuePaisa - summary.totalPaidPaisa;

  return summary;
}

/**
 * Get allocation strategy based on configuration or defaults
 *
 * @param {string} strategyType - 'proportional', 'fifo', 'manual'
 * @returns {Function} Allocation function
 */
export function getAllocationStrategy(strategyType = "proportional") {
  const strategies = {
    proportional: allocatePaymentProportionally,
    fifo: allocatePaymentFIFO,
    manual: allocatePaymentManually,
  };

  return strategies[strategyType] || strategies.proportional;
}
