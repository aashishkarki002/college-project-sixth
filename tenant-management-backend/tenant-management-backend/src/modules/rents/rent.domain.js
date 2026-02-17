import mongoose from "mongoose";

/**
 * Apply payment to rent (using integer paisa)
 *
 * This is the domain logic for applying payments.
 * All calculations use integer paisa to avoid floating point errors.
 *
 * @param {Object} rent - Rent document
 * @param {number} amountPaisa - Payment amount in paisa (integer)
 * @param {Date} paymentDate - Date of payment
 * @param {ObjectId|string} receivedBy - Admin who received payment
 */
export function applyPaymentToRent(rent, amountPaisa, paymentDate, receivedBy) {
  // Validate integer
  if (!Number.isInteger(amountPaisa)) {
    throw new Error(
      `Payment amount must be integer paisa, got: ${amountPaisa}`,
    );
  }

  rent.paidAmountPaisa += amountPaisa; // ✅ Integer arithmetic
  // ...
  const effectiveAmountPaisa =
    rent.rentAmountPaisa - (rent.tdsAmountPaisa || 0); // ✅ Integers
}
/**
 * Apply payment with unit breakdown
 * Distributes payment across specific units
 *
 * @param {Object} rent - Rent document
 * @param {number} totalAmountPaisa - Total payment in paisa
 * @param {Array} unitPayments - Array of {unitId, amountPaisa}
 * @param {Date} paymentDate - Payment date
 * @param {ObjectId} receivedBy - Admin who received payment
 */
export function applyPaymentWithUnitBreakdown(
  rent,
  totalAmountPaisa,
  unitPayments,
  paymentDate,
  receivedBy,
) {
  // Validate inputs
  if (!Number.isInteger(totalAmountPaisa)) {
    throw new Error(
      `Total amount must be integer paisa, got: ${totalAmountPaisa}`,
    );
  }

  if (!rent.useUnitBreakdown || !rent.unitBreakdown?.length) {
    throw new Error("Rent does not use unit breakdown");
  }

  // Validate unit payments sum equals total
  const unitPaymentsSum = unitPayments.reduce((sum, up) => {
    if (!Number.isInteger(up.amountPaisa)) {
      throw new Error(
        `Unit payment must be integer paisa, got: ${up.amountPaisa}`,
      );
    }
    return sum + up.amountPaisa;
  }, 0);

  if (unitPaymentsSum !== totalAmountPaisa) {
    throw new Error(
      `Unit payments sum (${unitPaymentsSum} paisa) does not match total (${totalAmountPaisa} paisa)`,
    );
  }

  // Apply payment to overall rent
  rent.paidAmountPaisa += totalAmountPaisa;
  rent.lastPaidDate = paymentDate;
  rent.lastPaidBy = receivedBy;

  // Apply payment to each unit
  unitPayments.forEach(({ unitId, amountPaisa }) => {
    const unitEntry = rent.unitBreakdown.find(
      (ub) => ub.unit.toString() === unitId.toString(),
    );

    if (!unitEntry) {
      throw new Error(`Unit ${unitId} not found in breakdown`);
    }

    unitEntry.paidAmountPaisa += amountPaisa;

    // Update unit status
    const effectiveUnitAmountPaisa =
      unitEntry.rentAmountPaisa - (unitEntry.tdsAmountPaisa || 0);

    if (unitEntry.paidAmountPaisa === 0) {
      unitEntry.status = "pending";
    } else if (unitEntry.paidAmountPaisa >= effectiveUnitAmountPaisa) {
      unitEntry.status = "paid";
    } else {
      unitEntry.status = "partially_paid";
    }
  });

  // Update overall rent status
  const effectiveRentPaisa = rent.rentAmountPaisa - (rent.tdsAmountPaisa || 0);

  if (rent.paidAmountPaisa === 0) {
    rent.status = "pending";
  } else if (rent.paidAmountPaisa >= effectiveRentPaisa) {
    rent.status = "paid";
  } else {
    rent.status = "partially_paid";
  }
}

/**
 * Calculate late fee (in paisa)
 *
 * @param {Object} rent - Rent document
 * @param {number} dailyRatePercent - Daily late fee rate as percentage (e.g., 0.1 for 0.1% per day)
 * @param {number} daysOverdue - Number of days overdue
 * @returns {number} Late fee in paisa (integer)
 */
export function calculateLateFee(rent, dailyRatePercent, daysOverdue) {
  if (daysOverdue <= 0) return 0;

  const effectiveRentPaisa = rent.rentAmountPaisa - (rent.tdsAmountPaisa || 0);
  const remainingPaisa = effectiveRentPaisa - rent.paidAmountPaisa;

  if (remainingPaisa <= 0) return 0;

  // Calculate late fee: remaining * (rate/100) * days
  // Using Math.round for banker's rounding
  const lateFeePaisa = Math.round(
    remainingPaisa * (dailyRatePercent / 100) * daysOverdue,
  );

  return Math.max(0, lateFeePaisa);
}

/**
 * Apply late fee to rent
 *
 * @param {Object} rent - Rent document
 * @param {number} lateFeePaisa - Late fee amount in paisa
 * @param {Date} lateFeeDate - Date late fee was applied
 */
export function applyLateFee(rent, lateFeePaisa, lateFeeDate) {
  if (!Number.isInteger(lateFeePaisa)) {
    throw new Error(`Late fee must be integer paisa, got: ${lateFeePaisa}`);
  }

  rent.lateFeePaisa = (rent.lateFeePaisa || 0) + lateFeePaisa;
  rent.lateFeeDate = lateFeeDate;
  rent.lateFeeApplied = true;
  rent.lateFeeStatus = "pending";
}

/**
 * Get rent payment breakdown (for reporting)
 *
 * @param {Object} rent - Rent document
 * @returns {Object} Payment breakdown with paisa and formatted values
 */
export function getRentPaymentBreakdown(rent) {
  const effectiveRentPaisa = rent.rentAmountPaisa - (rent.tdsAmountPaisa || 0);
  const remainingPaisa = effectiveRentPaisa - rent.paidAmountPaisa;

  return {
    // Raw paisa values (for calculations)
    paisa: {
      gross: rent.rentAmountPaisa,
      tds: rent.tdsAmountPaisa,
      effectiveRent: effectiveRentPaisa,
      paid: rent.paidAmountPaisa,
      remaining: remainingPaisa,
      lateFee: rent.lateFeePaisa || 0,
      total: effectiveRentPaisa + (rent.lateFeePaisa || 0),
    },

    // Rupee conversions (for display)
    rupees: {
      gross: rent.rentAmountPaisa / 100,
      tds: rent.tdsAmountPaisa / 100,
      effectiveRent: effectiveRentPaisa / 100,
      paid: rent.paidAmountPaisa / 100,
      remaining: remainingPaisa / 100,
      lateFee: (rent.lateFeePaisa || 0) / 100,
      total: (effectiveRentPaisa + (rent.lateFeePaisa || 0)) / 100,
    },

    status: rent.status,
    paymentPercentage:
      effectiveRentPaisa > 0
        ? (rent.paidAmountPaisa / effectiveRentPaisa) * 100
        : 0,
  };
}

/**
 * Validate rent payment amount
 *
 * @param {Object} rent - Rent document
 * @param {number} paymentAmountPaisa - Proposed payment in paisa
 * @returns {Object} Validation result
 */
export function validateRentPayment(rent, paymentAmountPaisa) {
  if (!Number.isInteger(paymentAmountPaisa)) {
    return {
      valid: false,
      error: "Payment amount must be an integer (paisa)",
    };
  }

  if (paymentAmountPaisa <= 0) {
    return {
      valid: false,
      error: "Payment amount must be positive",
    };
  }

  const effectiveRentPaisa = rent.rentAmountPaisa - (rent.tdsAmountPaisa || 0);
  const remainingPaisa = effectiveRentPaisa - rent.paidAmountPaisa;

  if (paymentAmountPaisa > remainingPaisa) {
    return {
      valid: false,
      error: `Payment amount (${paymentAmountPaisa / 100} Rs) exceeds remaining balance (${remainingPaisa / 100} Rs)`,
      remainingPaisa,
    };
  }

  return {
    valid: true,
    remainingAfterPaymentPaisa: remainingPaisa - paymentAmountPaisa,
    willBePaid: paymentAmountPaisa === remainingPaisa,
  };
}

export default {
  applyPaymentToRent,
  applyPaymentWithUnitBreakdown,
  calculateLateFee,
  applyLateFee,
  getRentPaymentBreakdown,
  validateRentPayment,
};
