import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for security deposit received (DR Cash/Bank, CR Security Deposit Liability).
 * Uses paisa for all amounts.
 * @param {Object} sd - Security deposit document with _id, amountPaisa, paidDate, tenant, property
 * @param {Object} options - { createdBy }; optional nepaliMonth, nepaliYear if not derivable from paidDate
 * @param {string} [cashBankAccountCode] - Account code for DR (default CASH_BANK 1000)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildSecurityDepositJournal(
  sd,
  options = {},
  cashBankAccountCode = ACCOUNT_CODES.CASH_BANK
) {
  const {
    createdBy,
    nepaliMonth: optNepaliMonth,
    nepaliYear: optNepaliYear,
    tenantName: optTenantName,
  } = options;
  const transactionDate = sd.paidDate || new Date();
  const d = new Date(transactionDate);
  const nepaliMonth = optNepaliMonth ?? d.getMonth() + 1;
  const nepaliYear = optNepaliYear ?? d.getFullYear();
  const nepaliDate = transactionDate;
  const tenantName =
    optTenantName ?? sd?.tenant?.name ?? (sd?.tenant ? "Tenant" : "Unknown");
  const description = `Security deposit received from ${tenantName} for ${nepaliMonth}/${nepaliYear}`;

  // Get amount in paisa (use paisa field if available, otherwise convert)
  const amountPaisa = sd.amountPaisa !== undefined
    ? sd.amountPaisa
    : (sd.amount ? rupeesToPaisa(sd.amount) : 0);

  return {
    transactionType: "SECURITY_DEPOSIT",
    referenceType: "SecurityDeposit",
    referenceId: sd._id,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy,
    totalAmountPaisa: amountPaisa,
    totalAmount: amountPaisa / 100, // Backward compatibility
    tenant: sd.tenant,
    property: sd.property,
    entries: [
      {
        accountCode: cashBankAccountCode,
        debitAmountPaisa: amountPaisa,
        debitAmount: amountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description,
      },
      {
        accountCode: ACCOUNT_CODES.SECURITY_DEPOSIT_LIABILITY,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: amountPaisa,
        creditAmount: amountPaisa / 100, // Backward compatibility
        description,
      },
    ],
  };
}
