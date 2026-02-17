import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for manual revenue received (DR Cash/Bank, CR Revenue).
 * Uses paisa for all amounts.
 * @param {Object} revenue - Revenue document with _id
 * @param {Object} options - amountPaisa or amount, paymentDate, nepaliDate, description, createdBy; optional nepaliMonth, nepaliYear, tenantName or tenant (for description)
 * @param {string} [cashBankAccountCode] - Account code for DR (default CASH_BANK 1000)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildRevenueReceivedJournal(
  revenue,
  options,
  cashBankAccountCode = ACCOUNT_CODES.CASH_BANK
) {
  const {
    amountPaisa,
    amount, // Backward compatibility
    paymentDate,
    nepaliDate,
    description,
    createdBy,
    nepaliMonth: optNepaliMonth,
    nepaliYear: optNepaliYear,
    tenantName,
    tenant,
  } = options;
  
  // Use paisa if provided, otherwise convert from rupees
  const finalAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (amount ? rupeesToPaisa(amount) : 0);

  const transactionDate = paymentDate || new Date();
  const npDate = nepaliDate || transactionDate;
  const d = new Date(npDate);
  const nepaliMonth = optNepaliMonth ?? d.getMonth() + 1;
  const nepaliYear = optNepaliYear ?? d.getFullYear();
  const name = tenantName ?? tenant?.name;
  const desc = description || "Manual revenue received";
  const fullDescription = name ? `${desc} from ${name}` : desc;

  return {
    transactionType: "REVENUE_STREAM",
    referenceType: "Revenue",
    referenceId: revenue._id,
    transactionDate,
    nepaliDate: npDate,
    nepaliMonth,
    nepaliYear,
    description: fullDescription,
    createdBy,
    totalAmountPaisa: finalAmountPaisa,
    totalAmount: finalAmountPaisa / 100, // Backward compatibility
    entries: [
      {
        accountCode: cashBankAccountCode,
        debitAmountPaisa: finalAmountPaisa,
        debitAmount: finalAmountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description: fullDescription,
      },
      {
        accountCode: ACCOUNT_CODES.REVENUE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: finalAmountPaisa,
        creditAmount: finalAmountPaisa / 100, // Backward compatibility
        description: fullDescription,
      },
    ],
  };
}
