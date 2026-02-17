import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for a CAM payment received (DR Cash/Bank, CR Accounts Receivable).
 * Uses paisa for all amounts.
 * @param {Object} payment - Payment document with _id, paymentDate, nepaliDate, amountPaisa, createdBy/receivedBy
 * @param {Object} cam - Cam document with tenant, property, nepaliMonth, nepaliYear
 * @param {number} [amountPaisa] - Amount in paisa to record (defaults to payment.amountPaisa)
 * @param {number} [amount] - Amount in rupees (backward compatibility)
 * @param {string} [cashBankAccountCode] - Account code for DR (default CASH_BANK 1000)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildCamPaymentReceivedJournal(
  payment,
  cam,
  amountPaisa = undefined,
  amount = undefined, // Backward compatibility
  cashBankAccountCode = ACCOUNT_CODES.CASH_BANK,
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
    cam?.nepaliMonth ?? new Date(transactionDate).getMonth() + 1;
  const nepaliYear = cam?.nepaliYear ?? new Date(transactionDate).getFullYear();
  const description = `CAM payment received for ${nepaliMonth}/${nepaliYear} from ${cam?.tenant?.name}`;
  const createdBy = payment.createdBy ?? payment.receivedBy;

  return {
    transactionType: "CAM_PAYMENT_RECEIVED",
    referenceType: "CamPayment",
    referenceId: payment._id,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy,
    totalAmountPaisa: recordedAmountPaisa,
    totalAmount: recordedAmountPaisa / 100, // Backward compatibility
    tenant: cam?.tenant,
    property: cam?.property,
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
