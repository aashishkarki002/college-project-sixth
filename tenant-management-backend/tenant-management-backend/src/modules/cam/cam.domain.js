import mongoose from "mongoose";

/**
 * Apply payment to CAM (using integer paisa)
 * 
 * This is the domain logic for applying payments.
 * All calculations use integer paisa to avoid floating point errors.
 * 
 * @param {Object} cam - CAM document
 * @param {number} amountPaisa - Payment amount in paisa (integer)
 * @param {Date} paymentDate - Date of payment
 * @param {ObjectId|string} receivedBy - Admin who received payment
 */
export function applyPaymentToCam(cam, amountPaisa, paymentDate, receivedBy) {
  // Validate amount is an integer
  if (!Number.isInteger(amountPaisa)) {
    throw new Error(`Payment amount must be integer paisa, got: ${amountPaisa}`);
  }

  // Add to paid amount (integer addition - no float errors!)
  cam.paidAmountPaisa += amountPaisa;
  cam.paidDate = paymentDate;
  cam.lastPaidBy =
    receivedBy && mongoose.Types.ObjectId.isValid(receivedBy)
      ? new mongoose.Types.ObjectId(receivedBy)
      : null;

  // Update status based on payment amount (integer comparisons - precise!)
  const effectiveAmountPaisa = cam.amountPaisa;
  if (cam.paidAmountPaisa === 0) {
    cam.status = "pending";
  } else if (cam.paidAmountPaisa >= effectiveAmountPaisa) {
    cam.status = "paid";
  } else {
    cam.status = "partially_paid";
  }
}