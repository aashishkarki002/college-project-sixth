import { ACCOUNT_CODES } from "../config/accounts.js";
import { rupeesToPaisa } from "../../../utils/moneyUtil.js";

/**
 * Build journal payload for a rent charge (DR Accounts Receivable, CR Revenue).
 * Uses paisa for all amounts.
 * @param {Object} rent - Rent document (plain or populated) with _id, tenant, property, nepaliMonth, nepaliYear, nepaliDate, createdAt, createdBy, rentAmountPaisa
 * @returns {Object} Journal payload for postJournalEntry
 */
export function buildRentChargeJournal(rent) {
  const rentId = rent._id;
  const transactionDate = rent.createdAt || new Date();
  const nepaliDate = rent.nepaliDate || transactionDate;
  const nepaliMonth = rent.nepaliMonth;
  const nepaliYear = rent.nepaliYear;
  const description = `Rent charge for ${nepaliMonth} ${nepaliYear} from ${rent?.tenant?.name}`;

  // Get rent amount in paisa (use paisa field if available, otherwise convert)
  // Note: Rent model has a getter that converts paisa to rupees, so we need to access raw value
  // Try to get raw value from _doc first, then try get() with getters: false, then fallback to direct access
  let rentAmountPaisa;
  if (rent._doc?.rentAmountPaisa !== undefined) {
    // Raw document value (bypasses getter)
    rentAmountPaisa = rent._doc.rentAmountPaisa;
  } else if (rent.get && typeof rent.get === 'function') {
    // Mongoose document - try to get raw value
    try {
      rentAmountPaisa = rent.get('rentAmountPaisa', null, { getters: false });
    } catch (e) {
      // Fallback to direct access
      rentAmountPaisa = rent.rentAmountPaisa;
    }
  } else {
    // Plain object
    rentAmountPaisa = rent.rentAmountPaisa;
  }

  // If we got a value, ensure it's an integer paisa
  // If it's a decimal and > 100, it's likely already in paisa (decimal), round it
  // If it's a decimal and < 100, it's likely in rupees, convert it
  if (rentAmountPaisa !== undefined && rentAmountPaisa !== null) {
    if (!Number.isInteger(rentAmountPaisa)) {
      if (rentAmountPaisa > 100) {
        // Likely decimal paisa, round it
        rentAmountPaisa = Math.round(rentAmountPaisa);
      } else {
        // Likely rupees, convert it
        rentAmountPaisa = rupeesToPaisa(rentAmountPaisa);
      }
    }
  } else if (rent.rentAmount !== undefined && rent.rentAmount !== null) {
    // Fallback to rentAmount (rupees) and convert
    rentAmountPaisa = rupeesToPaisa(rent.rentAmount);
  } else {
    rentAmountPaisa = 0;
  }

  // Derive billing frequency and quarter (if applicable) so that
  // the Transaction & ledger clearly know whether this is a
  // monthly or quarterly rent.
  const billingFrequency = rent.rentFrequency || "monthly";
  const quarter =
    billingFrequency === "quarterly" && typeof nepaliMonth === "number"
      ? Math.ceil(nepaliMonth / 3)
      : undefined;

  return {
    transactionType: "RENT_CHARGE",
    referenceType: "Rent",
    referenceId: rentId,
    transactionDate,
    nepaliDate,
    nepaliMonth,
    nepaliYear,
    description,
    createdBy: rent.createdBy,
    totalAmountPaisa: rentAmountPaisa,
    totalAmount: rentAmountPaisa / 100, // Backward compatibility
    tenant: rent.tenant,
    property: rent.property,
     // Custom metadata used by ledger/transaction
    billingFrequency,
    quarter,
    entries: [
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debitAmountPaisa: rentAmountPaisa,
        debitAmount: rentAmountPaisa / 100, // Backward compatibility
        creditAmountPaisa: 0,
        creditAmount: 0,
        description: `Rent receivable for ${nepaliMonth} ${nepaliYear}`,
      },
      {
        accountCode: ACCOUNT_CODES.REVENUE,
        debitAmountPaisa: 0,
        debitAmount: 0,
        creditAmountPaisa: rentAmountPaisa,
        creditAmount: rentAmountPaisa / 100, // Backward compatibility
        description: `Rental income for ${nepaliMonth} ${nepaliYear}`,
      },
    ],
  };
}
