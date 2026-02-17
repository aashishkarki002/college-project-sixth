import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for a rent payment received (DR Cash/Bank, CR Accounts Receivable).
 * Uses CASH_BANK (1000) for all payment methods; override to CASH (1100) for cash if needed.
 * Uses paisa for all amounts.
 * @param {Object} payment - Payment document with _id, paymentDate, nepaliDate, amountPaisa, createdBy/receivedBy
 * @param {Object} rent - Rent document with tenant, property, nepaliMonth, nepaliYear
 * @param {number} [amountPaisa] - Amount in paisa to record (defaults to payment.amountPaisa)
 * @param {number} [amount] - Amount in rupees (backward compatibility)
 * @param {string} [cashBankAccountCode] - Account code for DR (default CASH_BANK 1000)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildPaymentReceivedJournal(
  payment,
  rent,
  amountPaisa = undefined,
  amount = undefined, // Backward compatibility
  cashBankAccountCode = ACCOUNT_CODES.CASH_BANK
) {
  // Use paisa if provided, otherwise convert from payment or amount parameter
  const recordedAmountPaisa = amountPaisa !== undefined
    ? amountPaisa
    : (payment.amountPaisa !== undefined
        ? payment.amountPaisa
        : (amount !== undefined
            ? rupeesToPaisa(amount)
            : (payment.amount ? rupeesToPaisa(payment.amount) : 0)));

  const transactionDate = payment.paymentDate || new Date();
  const nepaliDate = payment.nepaliDate || transactionDate;
  const nepaliMonth =
    rent?.nepaliMonth ?? new Date(transactionDate).getMonth() + 1;
  const nepaliYear =
    rent?.nepaliYear ?? new Date(transactionDate).getFullYear();
  const tenantName = rent?.tenant?.name ?? (rent?.tenant ? "Tenant" : "");
  const description = tenantName
    ? `Rent payment received for ${nepaliMonth} ${nepaliYear} from ${tenantName}`
    : `Rent payment received for ${nepaliMonth} ${nepaliYear}`;
  const createdBy = payment.createdBy ?? payment.receivedBy;

  return {
    transactionType: "RENT_PAYMENT_RECEIVED",
    referenceType: "RentPayment",
    referenceId: payment._id,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy,
    totalAmountPaisa: recordedAmountPaisa,
    totalAmount: recordedAmountPaisa / 100, // Backward compatibility
    tenant: rent?.tenant,
    property: rent?.property,
    entries: [
      {
        accountCode: cashBankAccountCode,
        debitAmountPaisa: recordedAmountPaisa,
        debitAmount: recordedAmountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description,
      },
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: recordedAmountPaisa,
        creditAmount: recordedAmountPaisa / 100, // Backward compatibility
        description,
      },
    ],
  };
}
