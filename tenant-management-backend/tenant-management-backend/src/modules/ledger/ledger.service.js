import mongoose from "mongoose";
import { Account } from "./accounts/Account.Model.js";
import { Transaction } from "./transactions/Transaction.Model.js";
import { LedgerEntry } from "./Ledger.Model.js";
import { getMonthsInQuarter } from "../../utils/nepaliMonthQuarter.js";
import {
  rupeesToPaisa,
  paisaToRupees,
  formatMoney,
} from "../../utils/moneyUtil.js";
/**
 * @typedef {Object} JournalEntryLine
 * @property {string} accountCode
 * @property {number} debitAmountPaisa
 * @property {number} creditAmountPaisa
 * @property {string} description
 * @property {mongoose.Types.ObjectId} [tenant]
 * @property {mongoose.Types.ObjectId} [property]
 */

/**
 * @typedef {Object} JournalPayload
 * @property {string} transactionType
 * @property {string} referenceType
 * @property {mongoose.Types.ObjectId} referenceId
 * @property {Date} transactionDate
 * @property {Date} nepaliDate
 * @property {number} nepaliMonth
 * @property {number} nepaliYear
 * @property {string} description
 * @property {mongoose.Types.ObjectId} createdBy
 * @property {number} totalAmount
 * @property {JournalEntryLine[]} entries
 * @property {mongoose.Types.ObjectId} [tenant]
 * @property {mongoose.Types.ObjectId} [property]
 */

class LedgerService {
  /**
   * Calculate balance change based on account type and debit/credit amounts
   * Uses PAISA (integer) values for precise calculations
   *
   * @param {string} accountType - Account type (ASSET, LIABILITY, REVENUE, EXPENSE, EQUITY)
   * @param {number} debitAmountPaisa - Debit amount in paisa (integer)
   * @param {number} creditAmountPaisa - Credit amount in paisa (integer)
   * @returns {number} Balance change in paisa (positive or negative integer)
   */
  calculateBalanceChange(accountType, debitAmountPaisa, creditAmountPaisa) {
    // Ensure we're working with integers
    if (
      !Number.isInteger(debitAmountPaisa) ||
      !Number.isInteger(creditAmountPaisa)
    ) {
      throw new Error(
        `Balance change must use integer paisa. Got debit: ${debitAmountPaisa}, credit: ${creditAmountPaisa}`,
      );
    }

    // Net amount (integer arithmetic - no float errors!)
    const netAmountPaisa = debitAmountPaisa - creditAmountPaisa;

    // For ASSET and EXPENSE accounts: Debit increases, Credit decreases
    if (accountType === "ASSET" || accountType === "EXPENSE") {
      return netAmountPaisa; // Debit - Credit
    }

    // For LIABILITY, REVENUE, and EQUITY accounts: Debit decreases, Credit increases
    if (
      accountType === "LIABILITY" ||
      accountType === "REVENUE" ||
      accountType === "EQUITY"
    ) {
      return -netAmountPaisa; // Credit - Debit
    }

    // Default fallback
    return netAmountPaisa;
  }

  /**
   * ✅ REFACTORED: Post a journal entry using integer paisa
   *
   * Key changes:
   * - All amounts in paisa (integers)
   * - No floating point arithmetic
   * - Precise balance calculations
   *
   * @param {JournalPayload} payload
   * @param {mongoose.ClientSession | null} [session=null]
   * @returns {Promise<{ transaction: Transaction, ledgerEntries: LedgerEntry[] }>}
   */
  async postJournalEntry(payload, session = null) {
    const {
      transactionType,
      referenceType,
      referenceId,
      transactionDate,
      nepaliDate,
      nepaliMonth,
      nepaliYear,
      description,
      createdBy,
      totalAmountPaisa,
      totalAmount,
      entries,
      tenant: payloadTenant,
      property: payloadProperty,
      billingFrequency,
      quarter,
    } = payload;

    if (!entries?.length) {
      throw new Error("Journal payload must have at least one entry");
    }

    // ✅ Convert entries to paisa if needed
    const paisaEntries = entries.map((entry) => {
      // If already in paisa, use as-is
      if (
        entry.debitAmountPaisa !== undefined ||
        entry.creditAmountPaisa !== undefined
      ) {
        return {
          ...entry,
          debitAmountPaisa: entry.debitAmountPaisa || 0,
          creditAmountPaisa: entry.creditAmountPaisa || 0,
        };
      }

      // Otherwise convert from rupees
      return {
        ...entry,
        debitAmountPaisa: entry.debitAmount
          ? rupeesToPaisa(entry.debitAmount)
          : 0,
        creditAmountPaisa: entry.creditAmount
          ? rupeesToPaisa(entry.creditAmount)
          : 0,
      };
    });

    // ✅ Validate debits = credits (in PAISA - precise integer arithmetic)
    const totalDebitPaisa = paisaEntries.reduce(
      (sum, e) => sum + (e.debitAmountPaisa || 0),
      0,
    );
    const totalCreditPaisa = paisaEntries.reduce(
      (sum, e) => sum + (e.creditAmountPaisa || 0),
      0,
    );

    // Integer comparison (exact!)
    if (totalDebitPaisa !== totalCreditPaisa) {
      throw new Error(
        `Journal entries do not balance: debits ${formatMoney(totalDebitPaisa)} vs credits ${formatMoney(totalCreditPaisa)}`,
      );
    }

    // Fetch accounts
    const accountCodes = [...new Set(paisaEntries.map((e) => e.accountCode))];
    const accounts = await Account.find({ code: { $in: accountCodes } })
      .session(session)
      .lean();
    const accountByCode = Object.fromEntries(accounts.map((a) => [a.code, a]));

    for (const code of accountCodes) {
      if (!accountByCode[code]) {
        throw new Error(`Account with code ${code} not found`);
      }
    }

    // ✅ Determine total amount (use paisa if available, otherwise convert)
    let finalTotalAmountPaisa =
      totalAmountPaisa !== undefined
        ? totalAmountPaisa
        : totalAmount
          ? rupeesToPaisa(totalAmount)
          : totalDebitPaisa;

    // Ensure finalTotalAmountPaisa is an integer
    // If it's a decimal and > 100, it's likely already in paisa (decimal), round it
    // If it's a decimal and < 100, it's likely in rupees, convert it
    if (!Number.isInteger(finalTotalAmountPaisa)) {
      if (finalTotalAmountPaisa > 100) {
        // Likely decimal paisa, round it
        finalTotalAmountPaisa = Math.round(finalTotalAmountPaisa);
      } else {
        // Likely rupees, convert it
        finalTotalAmountPaisa = rupeesToPaisa(finalTotalAmountPaisa);
      }
    }

    // Create transaction
    const [transaction] = await Transaction.create(
      [
        {
          type: transactionType,
          transactionDate,
          nepaliDate,
          description,
          referenceType,
          referenceId,

          // ✅ Store as PAISA (integer)
          totalAmountPaisa: finalTotalAmountPaisa,

          createdBy,
          status: "POSTED",
          billingFrequency,
          quarter,
        },
      ],
      { session },
    );

    console.log("✅ Transaction created:", {
      id: transaction._id,
      type: transactionType,
      amount: formatMoney(finalTotalAmountPaisa),
      amountPaisa: finalTotalAmountPaisa,
    });

    // ✅ Create ledger entries with PAISA values
    const ledgerEntries = [];
    for (const entry of paisaEntries) {
      const account = accountByCode[entry.accountCode];
      const debitAmountPaisa = entry.debitAmountPaisa || 0;
      const creditAmountPaisa = entry.creditAmountPaisa || 0;

      const [ledgerEntry] = await LedgerEntry.create(
        [
          {
            transaction: transaction._id,
            account: account._id,

            // ✅ Store as PAISA (integers)
            debitAmountPaisa,
            creditAmountPaisa,
            balancePaisa: 0, // Will be updated by account balance

            description: entry.description,
            tenant: entry.tenant ?? payloadTenant,
            property: entry.property ?? payloadProperty,
            nepaliMonth,
            nepaliYear,
            transactionDate,
          },
        ],
        { session },
      );
      ledgerEntries.push(ledgerEntry);

      // ✅ Update account balance (in PAISA - precise integer arithmetic!)
      const balanceChangePaisa = this.calculateBalanceChange(
        account.type,
        debitAmountPaisa,
        creditAmountPaisa,
      );

      await Account.findByIdAndUpdate(
        account._id,
        {
          // ✅ Increment balance in PAISA (integer addition)
          $inc: { currentBalancePaisa: balanceChangePaisa },
        },
        { session },
      ).exec();

      console.log(`   ├─ ${account.code}: ${entry.description}`);
      console.log(
        `   │  Debit: ${formatMoney(debitAmountPaisa)}, Credit: ${formatMoney(creditAmountPaisa)}`,
      );
      console.log(`   │  Balance change: ${formatMoney(balanceChangePaisa)}`);
    }

    console.log("✅ Journal entry posted successfully");

    return { transaction, ledgerEntries };
  }

  /**
   * ✅ REFACTORED: Get ledger entries with paisa values
   */
  async getLedger(filters = {}) {
    try {
      const query = {};

      // Filter by tenant
      if (filters.tenantId) {
        query.tenant = filters.tenantId;
      }

      // Filter by property
      if (filters.propertyId) {
        query.property = filters.propertyId;
      }

      // Filter by English date range
      if (filters.startDate || filters.endDate) {
        query.transactionDate = {};
        if (filters.startDate) {
          query.transactionDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          query.transactionDate.$lte = end;
        }
      }

      // Filter by Nepali year
      if (filters.nepaliYear) {
        query.nepaliYear = filters.nepaliYear;
      }

      // Filter by Nepali month
      if (filters.nepaliMonth) {
        query.nepaliMonth = filters.nepaliMonth;
      }

      // Filter by quarter
      if (filters.quarter) {
        const monthsInQuarter = getMonthsInQuarter(parseInt(filters.quarter));
        query.nepaliMonth = { $in: monthsInQuarter };
      }

      // Filter by ledger type
      if (filters.type && filters.type !== "all") {
        const accountType = filters.type === "revenue" ? "REVENUE" : "EXPENSE";
        const accounts = await Account.find({ type: accountType })
          .select("_id")
          .lean();
        const accountIds = accounts.map((a) => a._id);
        if (accountIds.length > 0) {
          query.account = { $in: accountIds };
        } else {
          query.account = { $in: [] };
        }
      }

      const entries = await LedgerEntry.find(query)
        .populate("account", "code name type")
        .populate("transaction", "type description transactionDate nepaliDate")
        .populate("tenant", "name email phone")
        .populate("property", "name address")
        .sort({ transactionDate: 1, createdAt: 1 })
        .lean();

      // ✅ Calculate running balance in PAISA (precise integer arithmetic)
      let runningBalancePaisa = 0;
      const statement = entries.map((entry) => {
        const accountType = entry.account?.type;
        let balanceChangePaisa;

        if (accountType === "ASSET" || accountType === "EXPENSE") {
          balanceChangePaisa = entry.debitAmountPaisa - entry.creditAmountPaisa;
        } else if (
          accountType === "LIABILITY" ||
          accountType === "REVENUE" ||
          accountType === "EQUITY"
        ) {
          balanceChangePaisa = entry.creditAmountPaisa - entry.debitAmountPaisa;
        } else {
          balanceChangePaisa = entry.debitAmountPaisa - entry.creditAmountPaisa;
        }

        runningBalancePaisa += balanceChangePaisa;

        return {
          _id: entry._id,
          date: entry.transactionDate,
          nepaliDate: entry.nepaliDate,
          nepaliMonth: entry.nepaliMonth,
          nepaliYear: entry.nepaliYear,
          account: entry.account,
          description: entry.description,

          // ✅ Include PAISA values (precise)
          paisa: {
            debit: entry.debitAmountPaisa,
            credit: entry.creditAmountPaisa,
            runningBalance: runningBalancePaisa,
          },

          // Rupee conversions (for display)
          debit: paisaToRupees(entry.debitAmountPaisa),
          credit: paisaToRupees(entry.creditAmountPaisa),
          runningBalance: paisaToRupees(runningBalancePaisa),

          // Formatted for UI
          formatted: {
            debit: formatMoney(entry.debitAmountPaisa),
            credit: formatMoney(entry.creditAmountPaisa),
            runningBalance: formatMoney(runningBalancePaisa),
          },

          tenant: entry.tenant,
          property: entry.property,
          transaction: entry.transaction,
          createdAt: entry.createdAt,
        };
      });

      // ✅ Calculate totals in PAISA
      const totalDebitPaisa = entries.reduce(
        (sum, e) => sum + e.debitAmountPaisa,
        0,
      );
      const totalCreditPaisa = entries.reduce(
        (sum, e) => sum + e.creditAmountPaisa,
        0,
      );
      const netBalancePaisa = totalDebitPaisa - totalCreditPaisa;

      return {
        entries: statement,
        summary: {
          totalEntries: statement.length,

          // Paisa values (precise)
          paisa: {
            totalDebit: totalDebitPaisa,
            totalCredit: totalCreditPaisa,
            netBalance: netBalancePaisa,
          },

          // Rupee conversions
          totalDebit: paisaToRupees(totalDebitPaisa),
          totalCredit: paisaToRupees(totalCreditPaisa),
          netBalance: paisaToRupees(netBalancePaisa),

          // Formatted
          formatted: {
            totalDebit: formatMoney(totalDebitPaisa),
            totalCredit: formatMoney(totalCreditPaisa),
            netBalance: formatMoney(netBalancePaisa),
          },
        },
        filters,
      };
    } catch (error) {
      console.error("Failed to get ledger:", error);
      throw error;
    }
  }

  /**
   * ✅ REFACTORED: Get ledger summary with paisa values
   */
  async getLedgerSummary(filters = {}) {
    try {
      const query = {};

      // Apply filters
      if (filters.tenantId) query.tenant = filters.tenantId;
      if (filters.nepaliYear) query.nepaliYear = filters.nepaliYear;

      if (filters.quarter) {
        const monthsInQuarter = getMonthsInQuarter(parseInt(filters.quarter));
        query.nepaliMonth = { $in: monthsInQuarter };
      }

      if (filters.startDate || filters.endDate) {
        query.transactionDate = {};
        if (filters.startDate) {
          query.transactionDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          query.transactionDate.$lte = end;
        }
      }

      // ✅ Aggregate using PAISA fields (precise integer sums)
      const summary = await LedgerEntry.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$account",
            totalDebitPaisa: { $sum: "$debitAmountPaisa" },
            totalCreditPaisa: { $sum: "$creditAmountPaisa" },
            entryCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "accounts",
            localField: "_id",
            foreignField: "_id",
            as: "accountDetails",
          },
        },
        {
          $unwind: "$accountDetails",
        },
        {
          $project: {
            accountCode: "$accountDetails.code",
            accountName: "$accountDetails.name",
            accountType: "$accountDetails.type",

            // Paisa values
            totalDebitPaisa: 1,
            totalCreditPaisa: 1,
            netBalancePaisa: {
              $subtract: ["$totalDebitPaisa", "$totalCreditPaisa"],
            },

            // Rupee conversions
            totalDebit: { $divide: ["$totalDebitPaisa", 100] },
            totalCredit: { $divide: ["$totalCreditPaisa", 100] },
            netBalance: {
              $divide: [
                { $subtract: ["$totalDebitPaisa", "$totalCreditPaisa"] },
                100,
              ],
            },

            entryCount: 1,
          },
        },
        {
          $sort: { accountCode: 1 },
        },
      ]);

      // ✅ Calculate grand total in PAISA
      const grandTotalDebitPaisa = summary.reduce(
        (sum, acc) => sum + acc.totalDebitPaisa,
        0,
      );
      const grandTotalCreditPaisa = summary.reduce(
        (sum, acc) => sum + acc.totalCreditPaisa,
        0,
      );
      const grandTotalEntries = summary.reduce(
        (sum, acc) => sum + acc.entryCount,
        0,
      );

      return {
        accounts: summary,
        grandTotal: {
          // Paisa values (precise)
          paisa: {
            totalDebit: grandTotalDebitPaisa,
            totalCredit: grandTotalCreditPaisa,
            netBalance: grandTotalDebitPaisa - grandTotalCreditPaisa,
          },

          // Rupee conversions
          totalDebit: paisaToRupees(grandTotalDebitPaisa),
          totalCredit: paisaToRupees(grandTotalCreditPaisa),
          netBalance: paisaToRupees(
            grandTotalDebitPaisa - grandTotalCreditPaisa,
          ),

          // Formatted
          formatted: {
            totalDebit: formatMoney(grandTotalDebitPaisa),
            totalCredit: formatMoney(grandTotalCreditPaisa),
            netBalance: formatMoney(
              grandTotalDebitPaisa - grandTotalCreditPaisa,
            ),
          },

          totalEntries: grandTotalEntries,
        },
        filters,
      };
    } catch (error) {
      console.error("Failed to get ledger summary:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * Converts rupee inputs to paisa internally
   */
  async createTransaction(transactionData) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Convert entries to paisa
      const paisaEntries = transactionData.entries.map((entry) => ({
        accountCode: entry.account.code,
        debitAmountPaisa: rupeesToPaisa(entry.debit || 0),
        creditAmountPaisa: rupeesToPaisa(entry.credit || 0),
        description: entry.description,
      }));

      const payload = {
        transactionType: transactionData.type,
        referenceType: transactionData.referenceType,
        referenceId: transactionData.referenceId,
        transactionDate: transactionData.transactionDate,
        nepaliDate: transactionData.nepaliDate,
        nepaliMonth: transactionData.nepaliMonth,
        nepaliYear: transactionData.nepaliYear,
        description: transactionData.description,
        createdBy: transactionData.createdBy,
        totalAmountPaisa: rupeesToPaisa(transactionData.totalAmount),
        entries: paisaEntries,
        tenant: transactionData.tenant,
        property: transactionData.property,
      };

      const result = await this.postJournalEntry(payload, session);
      await session.commitTransaction();

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const ledgerService = new LedgerService();
