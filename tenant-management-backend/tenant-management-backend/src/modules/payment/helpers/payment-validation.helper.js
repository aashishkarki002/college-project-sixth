/**
 * Payment Validation Helpers
 *
 * Industry Standard: Validator Pattern
 * Fail-fast validation before any mutations
 */

import mongoose from "mongoose";
import { formatMoney } from "../../../utils/moneyUtil.js";

/**
 * Validate unit allocations match rent structure
 *
 * Industry Standard: Input validation at boundaries
 * Prevents invalid state from entering the system
 *
 * @param {Array} unitBreakdown - Rent's unit breakdown
 * @param {Array} unitAllocations - Proposed allocations
 * @param {number} totalPaymentPaisa - Total payment amount
 * @throws {Error} If validation fails
 */
export function validateUnitAllocations(
  unitBreakdown,
  unitAllocations,
  totalPaymentPaisa,
) {
  // Validate total matches
  const allocatedTotal = unitAllocations.reduce(
    (sum, a) => sum + a.amountPaisa,
    0,
  );

  if (allocatedTotal !== totalPaymentPaisa) {
    throw new Error(
      `Unit allocations (${formatMoney(allocatedTotal)}) don't match total payment (${formatMoney(totalPaymentPaisa)})`,
    );
  }

  // Validate each unit exists and doesn't exceed remaining
  unitAllocations.forEach(({ unitId, amountPaisa }) => {
    const unitIdStr = unitId.toString();
    const unit = unitBreakdown.find((u) => {
      const uUnit = u.unit;
      if (!uUnit) return false;

      // Support both populated (document) and unpopulated (ObjectId) refs
      const actualId = uUnit._id ? uUnit._id.toString() : uUnit.toString();
      return actualId === unitIdStr;
    });

    if (!unit) {
      throw new Error(`Unit ${unitId} not found in rent breakdown`);
    }

    const remaining = (unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0);
    console.log("remaining", remaining);
    if (amountPaisa > remaining) {
      throw new Error(
        `Payment ${formatMoney(amountPaisa)} exceeds remaining ${formatMoney(remaining)} for unit ${unitId}`,
      );
    }

    // Ensure amount is positive
    if (amountPaisa <= 0) {
      throw new Error(
        `Unit allocation amount must be positive, got ${amountPaisa}`,
      );
    }
  });
}

/**
 * Validate payment allocations structure (rent + CAM)
 *
 * @param {Object} allocations - Payment allocations object
 * @returns {Object} {isValid: boolean, error?: string}
 */
export function validatePaymentAllocations(allocations) {
  if (!allocations || (!allocations.rent && !allocations.cam)) {
    return {
      isValid: false,
      error: "At least one allocation (rent or CAM) is required",
    };
  }

  // Validate rent allocation if present
  if (allocations.rent) {
    if (!allocations.rent.rentId) {
      return {
        isValid: false,
        error: "Rent ID is required when rent allocation is provided",
      };
    }

    if (!mongoose.Types.ObjectId.isValid(allocations.rent.rentId)) {
      return { isValid: false, error: "Invalid rent ID format" };
    }

    const rentAmountPaisa =
      allocations.rent.amountPaisa !== undefined
        ? allocations.rent.amountPaisa
        : allocations.rent.amount
          ? Math.round(allocations.rent.amount * 100)
          : 0;

    if (!rentAmountPaisa || rentAmountPaisa <= 0) {
      return { isValid: false, error: "Rent amount must be greater than 0" };
    }

    // Validate unit allocations if provided
    if (
      allocations.rent.unitAllocations &&
      allocations.rent.unitAllocations.length > 0
    ) {
      const unitTotal = allocations.rent.unitAllocations.reduce(
        (sum, ua) => sum + (ua.amountPaisa || 0),
        0,
      );

      if (unitTotal !== rentAmountPaisa) {
        return {
          isValid: false,
          error: `Unit allocations total (${formatMoney(unitTotal)}) doesn't match rent amount (${formatMoney(rentAmountPaisa)})`,
        };
      }
    }
  }

  // Validate CAM allocation if present
  if (allocations.cam) {
    if (!allocations.cam.camId) {
      return {
        isValid: false,
        error: "CAM ID is required when CAM allocation is provided",
      };
    }

    if (!mongoose.Types.ObjectId.isValid(allocations.cam.camId)) {
      return { isValid: false, error: "Invalid CAM ID format" };
    }

    const camAmountPaisa =
      allocations.cam.paidAmountPaisa !== undefined
        ? allocations.cam.paidAmountPaisa
        : allocations.cam.paidAmount
          ? Math.round(allocations.cam.paidAmount * 100)
          : 0;

    if (!camAmountPaisa || camAmountPaisa <= 0) {
      return { isValid: false, error: "CAM paidAmount must be greater than 0" };
    }
  }

  return { isValid: true };
}

/**
 * Validate payment doesn't exceed rent balance
 *
 * @param {Object} rent - Rent document
 * @param {number} paymentPaisa - Payment amount
 * @param {Array} unitAllocations - Optional unit allocations
 * @throws {Error} If overpayment detected
 */
export function validatePaymentNotExceeding(
  rent,
  paymentPaisa,
  unitAllocations = null,
) {
  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    // Multi-unit: validate per unit
    if (unitAllocations && unitAllocations.length > 0) {
      validateUnitAllocations(
        rent.unitBreakdown,
        unitAllocations,
        paymentPaisa,
      );
    } else {
      // No manual allocation - just check total remaining
      const totalRemaining = rent.unitBreakdown.reduce((sum, unit) => {
        return (
          sum + ((unit.rentAmountPaisa || 0) - (unit.paidAmountPaisa || 0))
        );
      }, 0);

      if (paymentPaisa > totalRemaining) {
        throw new Error(
          `Payment ${formatMoney(paymentPaisa)} exceeds remaining balance ${formatMoney(totalRemaining)}`,
        );
      }
    }
  } else {
    // Single-unit: simple check
    const remaining = (rent.rentAmountPaisa || 0) - (rent.paidAmountPaisa || 0);
    if (paymentPaisa > remaining) {
      throw new Error(
        `Payment ${formatMoney(paymentPaisa)} exceeds remaining balance ${formatMoney(remaining)}`,
      );
    }
  }
}

/**
 * Validate CAM payment doesn't exceed remaining balance
 *
 * CAM payments are added to paidAmountPaisa. This ensures the
 * payment would not cause paidAmountPaisa > amountPaisa.
 *
 * @param {Object} cam - CAM document with amountPaisa, paidAmountPaisa
 * @param {number} paymentPaisa - Payment amount in paisa to apply
 * @throws {Error} If payment would exceed CAM amount
 */
export function validateCamPaymentNotExceeding(cam, paymentPaisa) {
  const amountPaisa = cam.amountPaisa ?? 0;
  const paidAmountPaisa = cam.paidAmountPaisa ?? 0;
  const remainingPaisa = amountPaisa - paidAmountPaisa;

  if (paymentPaisa > remainingPaisa) {
    throw new Error(
      `CAM payment ${formatMoney(paymentPaisa)} exceeds remaining balance ${formatMoney(remainingPaisa)} (CAM total: ${formatMoney(amountPaisa)}, already paid: ${formatMoney(paidAmountPaisa)})`,
    );
  }
}

/**
 * Validate all paisa values are integers
 *
 * @param {Object} data - Data object with paisa fields
 * @param {Array} fields - Field names to validate
 * @throws {Error} If non-integer found
 */
export function validatePaisaIntegrity(data, fields) {
  fields.forEach((field) => {
    const value = data[field];
    if (value !== undefined && value !== null && !Number.isInteger(value)) {
      throw new Error(`${field} must be an integer (paisa), got: ${value}`);
    }
  });
}
