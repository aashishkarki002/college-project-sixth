import { PAYMENT_METHODS } from "../constants/tenant.constant";

export const validateLeaseDetails = (values) => {
  const errors = [];

  if (values.leaseStartDate && values.leaseEndDate) {
    if (new Date(values.leaseEndDate) < new Date(values.leaseStartDate)) {
      errors.push("Lease end date must be after lease start date");
    }
  }

  return errors;
};

export const validatePaymentMethod = (values) => {
  const errors = [];

  if (
    values.paymentMethod === PAYMENT_METHODS.BANK_GUARANTEE &&
    !values.bankGuaranteePhoto
  ) {
    errors.push("Please upload bank guarantee photo");
  }

  if (values.paymentMethod === PAYMENT_METHODS.CHEQUE) {
    if (!values.chequeAmount || !values.chequeNumber) {
      errors.push("Please provide cheque amount and cheque number");
    }
  }

  return errors;
};

export const validateUnits = (values) => {
  const errors = [];

  if (
    !values.unitNumber ||
    !Array.isArray(values.unitNumber) ||
    values.unitNumber.length === 0
  ) {
    errors.push("Please select at least one unit");
    return errors;
  }

  const isBankGuarantee =
    values.paymentMethod === PAYMENT_METHODS.BANK_GUARANTEE;

  const missingFinancials = values.unitNumber.filter((unitId) => {
    const unitFinancial = values.unitFinancials?.[unitId];
    return (
      !unitFinancial ||
      !unitFinancial.sqft ||
      !unitFinancial.pricePerSqft ||
      !unitFinancial.camPerSqft ||
      (!isBankGuarantee && !unitFinancial.securityDeposit)
    );
  });

  if (missingFinancials.length > 0) {
    errors.push("Please fill in all financial details for all selected units");
  }

  return errors;
};

export const validateTenantForm = (values) => {
  const errors = [
    ...validateLeaseDetails(values),
    ...validatePaymentMethod(values),
    ...validateUnits(values),
  ];
  if (values.unitNumber?.length > 0) {
    values.unitNumber.forEach((unitId, index) => {
      const financial = values.unitFinancials?.[unitId];

      if (!financial) {
        errors.push(`Financial details missing for unit ${index + 1}`);
        return;
      }

      if (!financial.sqft || parseFloat(financial.sqft) <= 0) {
        errors.push(`Invalid square footage for unit ${index + 1}`);
      }

      if (!financial.pricePerSqft || parseFloat(financial.pricePerSqft) < 0) {
        errors.push(`Invalid price per sqft for unit ${index + 1}`);
      }

      if (!financial.camPerSqft || parseFloat(financial.camPerSqft) < 0) {
        errors.push(`Invalid CAM rate for unit ${index + 1}`);
      }

      // Security deposit validation (if not bank guarantee)
      if (values.paymentMethod !== "bank_guarantee") {
        if (
          !financial.securityDeposit ||
          parseFloat(financial.securityDeposit) < 0
        ) {
          errors.push(`Invalid security deposit for unit ${index + 1}`);
        }
      }
    });
  }
  return errors;
};
