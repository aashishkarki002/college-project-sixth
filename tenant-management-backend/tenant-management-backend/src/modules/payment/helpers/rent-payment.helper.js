/**
 * Rent Payment Application Helpers
 *
 * Industry Standard: Domain Logic Layer
 * Encapsulates business rules for applying payments to rents
 */

import { getAllocationStrategy } from "./payment.allocation.helper.js";

/** Resolve unit ID string from ObjectId, populated doc, or string (handles .populate("unitBreakdown.unit") and strategy-returned unitId) */
function resolveUnitId(val) {
  if (val == null) return null;
  if (val._id) return val._id.toString();
  return typeof val === "string" ? val : val.toString();
}
import {
  validateUnitAllocations,
  validatePaymentNotExceeding,
} from "./payment-validation.helper.js";

/**
 * Apply payment to rent - handles both single-unit and multi-unit rents
 *
 * Industry Standard: Command pattern - mutates state with validation
 *
 * @param {Object} rent - Rent document (Mongoose model)
 * @param {number} totalPaymentPaisa - Total payment amount in paisa
 * @param {Array} unitAllocations - Optional unit-specific allocations
 * @param {Date} paymentDate - Payment date
 * @param {ObjectId} receivedBy - Admin who received payment
 * @param {string} allocationStrategy - Strategy: 'proportional', 'fifo', 'manual'
 */
export function applyPaymentToRent(
  rent,
  totalPaymentPaisa,
  unitAllocations = null,
  paymentDate,
  receivedBy,
  allocationStrategy = "proportional",
) {
  // Validate payment doesn't exceed balance
  validatePaymentNotExceeding(rent, totalPaymentPaisa, unitAllocations);

  // MULTI-UNIT RENT: Use unit breakdown
  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    let allocations = unitAllocations;

    // Auto-allocate if no manual allocation provided
    if (!allocations || allocations.length === 0) {
      const strategyFn = getAllocationStrategy(allocationStrategy);
      allocations = strategyFn(rent.unitBreakdown, totalPaymentPaisa);
    }

    // Validate allocations
    validateUnitAllocations(rent.unitBreakdown, allocations, totalPaymentPaisa);

    // Apply payment to each unit
    allocations.forEach(({ unitId, amountPaisa }) => {
      const unitIdStr = resolveUnitId(unitId);
      if (!unitIdStr) return;
      const unitBreakdown = rent.unitBreakdown.find(
        (u) => resolveUnitId(u.unit) === unitIdStr,
      );

      if (unitBreakdown) {
        unitBreakdown.paidAmountPaisa =
          (unitBreakdown.paidAmountPaisa || 0) + amountPaisa;
      }
    });

    // Recalculate rent-level totals from unit breakdown
    rent.paidAmountPaisa = rent.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.paidAmountPaisa || 0),
      0,
    );

    // Update metadata (same as single-unit)
    rent.lastPaidDate = paymentDate;
    rent.lastPaidBy = receivedBy;

    // Return allocations for audit trail
    return allocations;
  }

  // SINGLE-UNIT RENT: Direct payment to rent
  rent.paidAmountPaisa = (rent.paidAmountPaisa || 0) + totalPaymentPaisa;

  // Update metadata
  rent.lastPaidDate = paymentDate;
  rent.lastPaidBy = receivedBy;

  // Update status
  updateRentStatus(rent);

  return null; // No unit allocations for single-unit
}

/**
 * Update rent status based on payment completion
 *
 * Industry Standard: State machine pattern
 * Automatic status transitions based on payment progress
 *
 * @param {Object} rent - Rent document
 */
export function updateRentStatus(rent) {
  let totalDue, totalPaid;

  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    totalDue = rent.unitBreakdown.reduce(
      (sum, u) => sum + (u.rentAmountPaisa || 0),
      0,
    );
    totalPaid = rent.unitBreakdown.reduce(
      (sum, u) => sum + (u.paidAmountPaisa || 0),
      0,
    );
  } else {
    totalDue = rent.rentAmountPaisa || 0;
    totalPaid = rent.paidAmountPaisa || 0;
  }

  if (totalPaid >= totalDue) {
    rent.status = "paid";
  } else if (totalPaid > 0) {
    rent.status = "partially_paid";
  } else {
    rent.status = "pending";
  }
}

/**
 * Calculate remaining balance for rent
 *
 * @param {Object} rent - Rent document
 * @returns {number} Remaining balance in paisa
 */
export function calculateRentRemaining(rent) {
  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    return rent.unitBreakdown.reduce((sum, unit) => {
      return sum + ((unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0));
    }, 0);
  }

  return (rent.rentAmountPaisa || 0) - (rent.paidAmountPaisa || 0);
}

/**
 * Check if rent is fully paid
 *
 * @param {Object} rent - Rent document
 * @returns {boolean} True if fully paid
 */
export function isRentFullyPaid(rent) {
  return calculateRentRemaining(rent) <= 0;
}

/**
 * Get payment progress percentage
 *
 * @param {Object} rent - Rent document
 * @returns {number} Percentage (0-100)
 */
export function getRentPaymentProgress(rent) {
  let totalDue, totalPaid;

  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    totalDue = rent.unitBreakdown.reduce(
      (sum, u) => sum + (u.rentAmountPaisa || 0),
      0,
    );
    totalPaid = rent.unitBreakdown.reduce(
      (sum, u) => sum + (u.paidAmountPaisa || 0),
      0,
    );
  } else {
    totalDue = rent.rentAmountPaisa || 0;
    totalPaid = rent.paidAmountPaisa || 0;
  }

  if (totalDue === 0) return 0;
  return Math.round((totalPaid / totalDue) * 100);
}

/**
 * Get unit-level payment details
 *
 * @param {Object} rent - Rent document
 * @returns {Array} Unit payment details
 */
export function getUnitPaymentDetails(rent) {
  if (!rent.useUnitBreakdown || !rent.unitBreakdown?.length) {
    return null;
  }

  return rent.unitBreakdown.map((unit) => ({
    unitId: unit.unit,
    rentAmountPaisa: unit.rentAmountPaisa || 0,
    paidAmountPaisa: unit.paidAmountPaisa || 0,
    tdsAmountPaisa: unit.tdsAmountPaisa || 0,
    remainingPaisa: (unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0),
    progress: unit.rentAmountPaisa
      ? Math.round(((unit.paidAmountPaisa || 0) / unit.rentAmountPaisa) * 100)
      : 0,
  }));
}
