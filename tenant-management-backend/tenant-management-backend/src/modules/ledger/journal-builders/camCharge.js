import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for a CAM charge (DR Accounts Receivable, CR Revenue).
 * Uses paisa for all amounts.
 * @param {Object} cam - Cam document with _id, tenant, property, nepaliMonth, nepaliYear, nepaliDate, amountPaisa, createdAt
 * @param {Object} options - { createdBy } (Cam model may not have createdBy; pass from caller)
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildCamChargeJournal(cam, options = {}) {
  const { createdBy } = options;
  const transactionDate = cam.createdAt || new Date();
  const nepaliDate = cam.nepaliDate || transactionDate;
  const nepaliMonth = cam.nepaliMonth;
  const nepaliYear = cam.nepaliYear;
  const description = `CAM charge for ${nepaliMonth}/${nepaliYear} from ${cam?.tenant?.name}`;

  // Get CAM amount in paisa (use paisa field if available, otherwise convert)
  const amountPaisa = cam.amountPaisa !== undefined
    ? cam.amountPaisa
    : (cam.amount ? rupeesToPaisa(cam.amount) : 0);

  return {
    transactionType: "CAM_CHARGE",
    referenceType: "Cam",
    referenceId: cam._id,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy: createdBy || cam.createdBy,
    totalAmountPaisa: amountPaisa,
    totalAmount: amountPaisa / 100, // Backward compatibility
    tenant: cam.tenant,
    property: cam.property,
    entries: [
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debitAmountPaisa: amountPaisa,
        debitAmount: amountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description: `CAM receivable for ${nepaliMonth}/${nepaliYear}`,
      },
      {
        accountCode: ACCOUNT_CODES.REVENUE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: amountPaisa,
        creditAmount: amountPaisa / 100, // Backward compatibility
        description: `CAM income for ${nepaliMonth}/${nepaliYear}`,
      },
    ],
  };
}
