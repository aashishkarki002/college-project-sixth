import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa, paisaToRupees } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for an expense (DR Expense account, CR Cash/Bank).
 * Uses paisa for all amounts.
 * @param {Object} expense - Expense document with _id, amountPaisa, expenseCode, nepaliMonth, nepaliYear, EnglishDate, nepaliDate, createdBy, tenant, property
 * @param {string} [cashBankAccountCode] - Account code for CR (default CASH_BANK 1000)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildExpenseJournal(
  expense,
  cashBankAccountCode = ACCOUNT_CODES.CASH_BANK
) {
  const expenseAccountCode = expense.expenseCode ?? ACCOUNT_CODES.EXPENSE_OTHER;
  const transactionDate = expense.EnglishDate || new Date();
  const nepaliDate = expense.nepaliDate || transactionDate;
  const tenantName = expense?.tenant?.name;

  // Get amount in paisa (use paisa field if available, otherwise convert)
  const amountPaisa = expense.amountPaisa !== undefined
    ? expense.amountPaisa
    : (expense.amount ? rupeesToPaisa(expense.amount) : 0);

  const description = `Expense recorded - ${paisaToRupees(amountPaisa)}${tenantName ? ` from ${tenantName}` : ""}`;

  // Map expense referenceType to Transaction model type enum (no plain "EXPENSE")
  const typeMap = {
    MAINTENANCE: "MAINTENANCE_EXPENSE",
    UTILITY: "UTILITY_EXPENSE",
    SALARY: "OTHER_EXPENSE",
    MANUAL: "OTHER_EXPENSE",
  };
  const transactionType = typeMap[expense.referenceType] ?? "OTHER_EXPENSE";

  return {
    transactionType,
    referenceType: "Expense",
    referenceId: expense._id,
    transactionDate,
    nepaliDate,
    nepaliMonth: expense.nepaliMonth,
    nepaliYear: expense.nepaliYear,
    description,
    createdBy: expense.createdBy,
    totalAmountPaisa: amountPaisa,
    totalAmount: amountPaisa / 100, // Backward compatibility
    tenant: expense.tenant,
    property: expense.property,
    entries: [
      {
        accountCode: expenseAccountCode,
        debitAmountPaisa: amountPaisa,
        debitAmount: amountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description,
      },
      {
        accountCode: cashBankAccountCode,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: amountPaisa,
        creditAmount: amountPaisa / 100, // Backward compatibility
        description,
      },
    ],
  };
}
