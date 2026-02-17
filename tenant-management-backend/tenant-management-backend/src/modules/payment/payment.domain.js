import mongoose from "mongoose";
import { Payment } from "./payment.model.js";
import { ExternalPayment } from "./externalPayment.model.js";

/**
 * Merge rent and CAM payment payloads into a single payment payload
 * @param {Object} rentPayload - Rent payment payload (optional)
 * @param {Object} camPayload - CAM payment payload (optional)
 * @returns {Object} Merged payment payload
 */
export function mergePaymentPayloads(rentPayload, camPayload) {
  // If both exist, merge them
  if (rentPayload && camPayload) {
    const rentAmountPaisa = rentPayload.amountPaisa !== undefined
      ? rentPayload.amountPaisa
      : (rentPayload.amount ? Math.round(rentPayload.amount * 100) : 0);
    
    const camAmountPaisa = camPayload.amountPaisa !== undefined
      ? camPayload.amountPaisa
      : (camPayload.amount ? Math.round(camPayload.amount * 100) : 0);
    
    const totalAmountPaisa = rentAmountPaisa + camAmountPaisa;

    return {
      tenant: rentPayload.tenant || camPayload.tenant,
      amountPaisa: totalAmountPaisa,
      amount: totalAmountPaisa / 100, // Backward compatibility
      paymentDate: rentPayload.paymentDate || camPayload.paymentDate,
      nepaliDate: rentPayload.nepaliDate || camPayload.nepaliDate,
      paymentMethod: rentPayload.paymentMethod || camPayload.paymentMethod,
      paymentStatus:
        rentPayload.paymentStatus || camPayload.paymentStatus || "paid",
      note: rentPayload.note || camPayload.note,
      transactionRef: rentPayload.transactionRef || camPayload.transactionRef || null,
      createdBy: rentPayload.createdBy || camPayload.createdBy,
      rent: rentPayload.rent || null,
      cam: camPayload.cam || null,
      allocations: {
        rent: rentPayload.allocations?.rent || null,
        cam: camPayload.allocations?.cam || null,
      },
      bankAccount: rentPayload.bankAccount || camPayload.bankAccount || null,
      receivedBy: rentPayload.receivedBy || camPayload.receivedBy || null,
    };
  }

  // If only rent exists
  if (rentPayload) {
    return rentPayload;
  }

  // If only CAM exists
  if (camPayload) {
    return camPayload;
  }

  throw new Error("At least one payload (rent or CAM) must be provided");
}

export function buildPaymentPayload({
  tenantId,
  amountPaisa,
  amount, // Backward compatibility
  paymentDate,
  nepaliDate,
  paymentMethod,
  paymentStatus,
  note,
  adminId,
  bankAccountId,
  receivedBy,
  rent,
  cam,
  allocations,
}) {
  // Use paisa if provided, otherwise convert from rupees
  const finalAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (amount ? Math.round(amount * 100) : 0);

  const payload = {
    tenant: tenantId,
    amountPaisa: finalAmountPaisa,
    amount: finalAmountPaisa / 100, // Backward compatibility
    paymentDate,
    nepaliDate,
    paymentMethod,
    paymentStatus: paymentStatus || "paid",
    note,
    createdBy: new mongoose.Types.ObjectId(adminId),
    rent: rent || null,
    cam: cam || null,
    allocations,
  };

  if (bankAccountId) payload.bankAccount = bankAccountId;
  if (receivedBy) payload.receivedBy = receivedBy;

  return payload;
}

/**
 * Build payment payload for rent allocation
 * @param {Object} params - Payment parameters
 * @returns {Object} Rent payment payload
 */
export function buildRentPaymentPayload({
  tenantId,
  amountPaisa,
  amount, // Backward compatibility
  paymentDate,
  nepaliDate,
  paymentMethod,
  paymentStatus,
  note,
  transactionRef,
  adminId,
  bankAccountId,
  receivedBy,
  rentId,
  allocations,
}) {
  // Use paisa if provided, otherwise convert from rupees
  const finalAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (amount ? Math.round(amount * 100) : 0);

  const payload = {
    tenant: tenantId,
    amountPaisa: finalAmountPaisa,
    amount: finalAmountPaisa / 100, // Backward compatibility
    paymentDate,
    nepaliDate,
    paymentMethod,
    paymentStatus: paymentStatus || "paid",
    note,
    createdBy: new mongoose.Types.ObjectId(adminId),
    rent: rentId || null,
    cam: null,
    allocations: {
      rent: allocations?.rent || null,
      cam: null,
    },
  };

  if (bankAccountId) payload.bankAccount = bankAccountId;
  if (receivedBy) payload.receivedBy = receivedBy;
  if (transactionRef) payload.transactionRef = transactionRef;

  return payload;
}

/**
 * Build payment payload for CAM allocation
 * @param {Object} params - Payment parameters
 * @returns {Object} CAM payment payload
 */
export function buildCamPaymentPayload({
  tenantId,
  amountPaisa,
  amount, // Backward compatibility
  paymentDate,
  nepaliDate,
  paymentMethod,
  paymentStatus,
  note,
  transactionRef,
  adminId,
  bankAccountId,
  receivedBy,
  camId,
  allocations,
}) {
  // Use paisa if provided, otherwise convert from rupees
  const finalAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (amount ? Math.round(amount * 100) : 0);

  const payload = {
    tenant: tenantId,
    amountPaisa: finalAmountPaisa,
    amount: finalAmountPaisa / 100, // Backward compatibility
    paymentDate,
    nepaliDate,
    paymentMethod,
    paymentStatus: paymentStatus || "paid",
    note,
    createdBy: new mongoose.Types.ObjectId(adminId),
    rent: null,
    cam: camId || null,
    allocations: {
      rent: null,
      cam: allocations?.cam || null,
    },
  };

  if (bankAccountId) payload.bankAccount = bankAccountId;
  if (receivedBy) payload.receivedBy = receivedBy;
  if (transactionRef) payload.transactionRef = transactionRef;

  return payload;
}

/**
 * Build payload for external (non-tenant) payment record
 * @param {Object} params
 * @param {string} params.payerName - External payer's name
 * @param {number} params.amount - Payment amount
 * @param {Date} params.paymentDate - Payment date
 * @param {Object} params.other - Optional: nepaliDate, paymentMethod, paymentStatus, bankAccountId, note, adminId
 * @returns {Object} External payment payload
 */
export function buildExternalPaymentPayload({
  payerName,
  amountPaisa,
  amount, // Backward compatibility
  paymentDate,
  nepaliDate,
  paymentMethod = "bank_transfer",
  paymentStatus = "paid",
  bankAccountId,
  note,
  adminId,
}) {
  // Use paisa if provided, otherwise convert from rupees
  const finalAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (amount ? Math.round(amount * 100) : 0);

  const payload = {
    payerName,
    amountPaisa: finalAmountPaisa,
    amount: finalAmountPaisa / 100, // Backward compatibility
    paymentDate,
    paymentMethod,
    paymentStatus,
    note: note || undefined,
    createdBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
  };
  if (nepaliDate) payload.nepaliDate = nepaliDate;
  if (bankAccountId) payload.bankAccount = bankAccountId;
  return payload;
}

export async function createPaymentRecord(paymentPayload, session) {
  const [payment] = await Payment.create([paymentPayload], { session });
  return payment;
}

export async function createExternalPaymentRecord(paymentPayload, session) {
  const [payment] = await ExternalPayment.create([paymentPayload], { session });
  return payment;
}

/**
 * Calculate total payment amount from allocations (rent + CAM) in paisa
 * @param {Object} allocations - Payment allocations object
 * @returns {number} Total amount in paisa (integer)
 */
export function calculateTotalAmountFromAllocations(allocations) {
  // Use paisa fields if available, otherwise convert from rupees
  const rentAmountPaisa = allocations?.rent?.amountPaisa !== undefined
    ? allocations.rent.amountPaisa
    : (allocations?.rent?.amount ? Math.round(allocations.rent.amount * 100) : 0);
  
  const camAmountPaisa = allocations?.cam?.paidAmountPaisa !== undefined
    ? allocations.cam.paidAmountPaisa
    : (allocations?.cam?.paidAmount ? Math.round(allocations.cam.paidAmount * 100) : 0);
  
  return rentAmountPaisa + camAmountPaisa;
}

/**
 * Validate CAM allocation data
 * @param {Object} camAllocation - CAM allocation object with camId and paidAmount
 * @returns {Object} Validation result with isValid and error message
 */
export function validateCamAllocation(camAllocation) {
  if (!camAllocation) {
    return { isValid: true }; // CAM is optional
  }

  if (!camAllocation.camId) {
    return {
      isValid: false,
      error: "CAM ID is required when CAM allocation is provided",
    };
  }

  if (!mongoose.Types.ObjectId.isValid(camAllocation.camId)) {
    return { isValid: false, error: "Invalid CAM ID format" };
  }

  const camAmountPaisa = camAllocation.paidAmountPaisa !== undefined
    ? camAllocation.paidAmountPaisa
    : (camAllocation.paidAmount ? Math.round(camAllocation.paidAmount * 100) : 0);
  
  if (!camAmountPaisa || camAmountPaisa <= 0) {
    return { isValid: false, error: "CAM paidAmount must be greater than 0" };
  }

  return { isValid: true };
}

/**
 * Determine payment type based on allocations
 * @param {Object} allocations - Payment allocations object
 * @returns {string} Payment type: 'rent_only', 'cam_only', 'both', or 'none'
 */
export function getPaymentType(allocations) {
  const rentAmountPaisa = allocations?.rent?.amountPaisa !== undefined
    ? allocations.rent.amountPaisa
    : (allocations?.rent?.amount ? Math.round(allocations.rent.amount * 100) : 0);
  
  const camAmountPaisa = allocations?.cam?.paidAmountPaisa !== undefined
    ? allocations.cam.paidAmountPaisa
    : (allocations?.cam?.paidAmount ? Math.round(allocations.cam.paidAmount * 100) : 0);
  
  const hasRent = allocations?.rent?.rentId && rentAmountPaisa > 0;
  const hasCam = allocations?.cam?.camId && camAmountPaisa > 0;

  if (hasRent && hasCam) return "both";
  if (hasRent) return "rent_only";
  if (hasCam) return "cam_only";
  return "none";
}

/**
 * Prepare CAM data for receipt generation
 * @param {Object} cam - CAM document
 * @returns {Object} Formatted CAM data for receipt
 */
export function prepareCamDataForReceipt(cam) {
  if (!cam) return null;

  const nepaliMonths = [
    "Baisakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra",
  ];

  const monthName =
    nepaliMonths[cam.nepaliMonth - 1] || `Month ${cam.nepaliMonth}`;
  const paidFor = `${monthName} ${cam.nepaliYear}`;

  const amountPaisa = cam.amountPaisa || (cam.amount ? Math.round(cam.amount * 100) : 0);
  const paidAmountPaisa = cam.paidAmountPaisa || (cam.paidAmount ? Math.round(cam.paidAmount * 100) : 0);

  return {
    paidFor,
    monthName,
    nepaliMonth: cam.nepaliMonth,
    nepaliYear: cam.nepaliYear,
    amountPaisa,
    amount: amountPaisa / 100, // Backward compatibility
    paidAmountPaisa,
    paidAmount: paidAmountPaisa / 100, // Backward compatibility
    status: cam.status,
  };
}

/**
 * Validate payment allocations (both rent and CAM)
 * @param {Object} allocations - Payment allocations object
 * @returns {Object} Validation result with isValid and error message
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
    const rentAmountPaisa = allocations.rent.amountPaisa !== undefined
      ? allocations.rent.amountPaisa
      : (allocations.rent.amount ? Math.round(allocations.rent.amount * 100) : 0);
    if (!rentAmountPaisa || rentAmountPaisa <= 0) {
      return { isValid: false, error: "Rent amount must be greater than 0" };
    }
  }

  // Validate CAM allocation if present
  const camValidation = validateCamAllocation(allocations.cam);
  if (!camValidation.isValid) {
    return camValidation;
  }

  return { isValid: true };
}
