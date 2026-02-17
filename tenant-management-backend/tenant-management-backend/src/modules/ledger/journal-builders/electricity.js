import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa, paisaToRupees } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for an electricity charge (DR Accounts Receivable, CR Utility Revenue).
 * Uses paisa for all amounts.
 * @param {Object} electricity - Electricity document with _id, readingDate, nepaliDate, nepaliMonth, nepaliYear, consumption, ratePerUnitPaisa, totalAmountPaisa, createdBy, tenant, property
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildElectricityChargeJournal(electricity) {
  const electricityId = electricity._id;
  const transactionDate = electricity.readingDate || new Date();
  const nepaliDate = electricity.nepaliDate || transactionDate;
  const tenantName = electricity?.tenant?.name;
  
  // Get amounts in paisa (use paisa fields if available, otherwise convert)
  const totalAmountPaisa = electricity.totalAmountPaisa !== undefined
    ? electricity.totalAmountPaisa
    : (electricity.totalAmount ? rupeesToPaisa(electricity.totalAmount) : 0);
  
  const ratePerUnitPaisa = electricity.ratePerUnitPaisa !== undefined
    ? electricity.ratePerUnitPaisa
    : (electricity.ratePerUnit ? rupeesToPaisa(electricity.ratePerUnit) : 0);

  const description = `Electricity charge for ${electricity.nepaliMonth}/${electricity.nepaliYear} - ${electricity.consumption} units${tenantName ? ` from ${tenantName}` : ""}`;
  const lineDescription = `Electricity receivable - ${electricity.consumption} units @ Rs.${paisaToRupees(ratePerUnitPaisa)}`;
  const tenantId = electricity.tenant?._id ?? electricity.tenant;
  const propertyId = electricity.property?._id ?? electricity.property;

  return {
    transactionType: "ELECTRICITY_CHARGE",
    referenceType: "Electricity",
    referenceId: electricityId,
    transactionDate,
    nepaliDate,
    nepaliMonth: electricity.nepaliMonth,
    nepaliYear: electricity.nepaliYear,
    description,
    createdBy: electricity.createdBy,
    totalAmountPaisa: totalAmountPaisa,
    totalAmount: totalAmountPaisa / 100, // Backward compatibility
    tenant: tenantId,
    property: propertyId,
    entries: [
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debitAmountPaisa: totalAmountPaisa,
        debitAmount: totalAmountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description: lineDescription,
      },
      {
        accountCode: ACCOUNT_CODES.UTILITY_REVENUE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: totalAmountPaisa,
        creditAmount: totalAmountPaisa / 100, // Backward compatibility
        description: `Electricity revenue - ${electricity.consumption} units @ Rs.${paisaToRupees(ratePerUnitPaisa)}`,
      },
    ],
  };
}

/**
 * Build journal payload for an electricity payment received (DR Cash/Bank, CR Accounts Receivable).
 * Uses paisa for all amounts.
 * @param {Object} paymentData - { electricityId, amountPaisa or amount, paymentDate, nepaliDate, createdBy }
 * @param {Object} electricity - Electricity document with tenant, property, nepaliMonth, nepaliYear
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildElectricityPaymentJournal(paymentData, electricity) {
  const transactionDate = paymentData.paymentDate || new Date();
  const nepaliDate = paymentData.nepaliDate || transactionDate;
  const nepaliMonth = electricity.nepaliMonth;
  const nepaliYear = electricity.nepaliYear;
  const tenantName = electricity?.tenant?.name;
  const description = `Electricity payment - ${nepaliMonth}/${nepaliYear}${tenantName ? ` from ${tenantName}` : ""}`;
  const tenantId = electricity.tenant?._id ?? electricity.tenant;
  const propertyId = electricity.property?._id ?? electricity.property;

  // Use paisa if provided, otherwise convert from rupees
  const amountPaisa = paymentData.amountPaisa !== undefined
    ? paymentData.amountPaisa
    : (paymentData.amount ? rupeesToPaisa(paymentData.amount) : 0);

  return {
    transactionType: "ELECTRICITY_PAYMENT",
    referenceType: "Electricity",
    referenceId: paymentData.electricityId,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy: paymentData.createdBy,
    totalAmountPaisa: amountPaisa,
    totalAmount: amountPaisa / 100, // Backward compatibility
    tenant: tenantId,
    property: propertyId,
    entries: [
      {
        accountCode: ACCOUNT_CODES.CASH_BANK,
        debitAmountPaisa: amountPaisa,
        debitAmount: amountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description: "Electricity payment received",
      },
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: amountPaisa,
        creditAmount: amountPaisa / 100, // Backward compatibility
        description: "Electricity payment received",
      },
    ],
  };
}
