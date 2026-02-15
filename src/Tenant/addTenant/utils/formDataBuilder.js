import {
  calculateFinancialTotals,
  calculateAverageRates,
} from "./financialCalculation";

/**
 * Build FormData for tenant submission
 */
export const buildTenantFormData = (values, propertyId) => {
  const formData = new FormData();

  // Calculate aggregated totals
  const totals = calculateFinancialTotals(values.unitFinancials);
  const unitCount = values.unitNumber.length;
  const { avgPricePerSqft, avgCamPerSqft } = calculateAverageRates(
    totals,
    unitCount,
  );

  // Add property and basic info
  formData.append("property", propertyId);
  formData.append("block", values.block);
  formData.append("innerBlock", values.innerBlock);

  if (values.unitFinancials && Object.keys(values.unitFinancials).length > 0) {
    const unitLeases = values.unitNumber.map((unitId) => {
      const financial = values.unitFinancials[unitId];
      return {
        unitId: unitId,
        leasedSquareFeet: parseFloat(financial.sqft) || 0,
        pricePerSqft: parseFloat(financial.pricePerSqft) || 0,
        camRatePerSqft: parseFloat(financial.camPerSqft) || 0,
        securityDeposit: parseFloat(financial.securityDeposit) || 0,
      };
    });

    // Send as JSON string (FormData can't handle nested arrays)
    formData.append("unitLeases", JSON.stringify(unitLeases));
  }

  // Add tenant information
  const tenantFields = [
    "name",
    "phone",
    "email",
    "address",
    "status",
    "leaseStartDate",
    "leaseEndDate",
    "dateOfAgreementSigned",
    "keyHandoverDate",
    "spaceHandoverDate",
    "spaceReturnedDate",
    "paymentMethod",
    "tdsPercentage",
    "rentPaymentFrequency",
  ];

  tenantFields.forEach((field) => {
    if (values[field]) {
      formData.append(field, values[field]);
    }
  });

  // Add aggregated financial data for backward compatibility
  formData.append("leasedSquareFeet", totals.totalSqft.toString());
  formData.append("pricePerSqft", avgPricePerSqft.toString());
  formData.append("camRatePerSqft", avgCamPerSqft.toString());
  formData.append("securityDeposit", totals.totalSecurityDeposit.toString());

  // Add payment method specific fields (field name must match backend upload.fields: bank_guarantee)
  if (values.paymentMethod === "bank_guarantee" && values.bankGuaranteePhoto) {
    formData.append("bank_guarantee", values.bankGuaranteePhoto);
  }

  if (values.paymentMethod === "cheque") {
    if (values.chequeAmount)
      formData.append("chequeAmount", values.chequeAmount);
    if (values.chequeNumber)
      formData.append("chequeNumber", values.chequeNumber);
  }

  // tenant/src/Tenant/addTenant/utils/formDataBuilder.js

  const DOCUMENT_FIELD_MAP = {
    photo: "image",
    tenantPhoto: "image",
    leaseAgreement: "pdfAgreement",
    citizenship: "citizenShip",
    bankGuarantee: "bank_guarantee",
    cheque: "cheque",
    companyDocument: "company_docs",
    tds: "tax_certificate",
    other: "other",
  };

  if (values.documents && typeof values.documents === "object") {
    Object.entries(values.documents).forEach(([type, files]) => {
      const fieldName = DOCUMENT_FIELD_MAP[type] || "other";
      if (Array.isArray(files)) {
        files.forEach((file) => {
          formData.append(fieldName, file);
        });
      }
    });
  }
  return formData;
};
