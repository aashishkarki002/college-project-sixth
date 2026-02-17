import { ledgerService } from "../ledger/ledger.service.js";
import { Revenue } from "../revenue/Revenue.Model.js";
import { RevenueSource } from "../revenue/RevenueSource.Model.js";
import { Liability } from "../liabilities/Liabilities.Model.js";
import { LiabilitySource } from "../liabilities/LiabilitesSource.Model.js";
import { paisaToRupees } from "../../utils/moneyUtil.js";

/**
 * Build accounting summary for dashboard (revenue, liabilities, cash flow, breakdowns)
 * Filters:
 * - startDate / endDate (ISO strings, optional)
 * - nepaliYear (number, optional)
 * - quarter (1-4, optional)
 */
export async function getAccountingSummary({
  startDate,
  endDate,
  nepaliYear,
  quarter,
}) {
  // Build date filter for models that rely on calendar dates
  const buildDateFilter = () => {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    return Object.keys(dateFilter).length ? dateFilter : undefined;
  };

  const dateFilter = buildDateFilter();

  // Aggregate revenues directly from Revenue model with source lookup
  const revenueMatch = {};
  if (dateFilter) revenueMatch.date = dateFilter;

  const revenueAggregation = await Revenue.aggregate([
    { $match: revenueMatch },
    {
      $lookup: {
        from: RevenueSource.collection.name,
        localField: "source",
        foreignField: "_id",
        as: "sourceDetails",
      },
    },
    { $unwind: { path: "$sourceDetails", preserveNullAndEmptyArrays: true } },
    // Aggregate revenues: sum in paisa (integer arithmetic, no floating-point drift)
    {
      $group: {
        _id: "$source",
        totalAmountPaisa: { $sum: "$amountPaisa" },
        name: { $first: "$sourceDetails.name" },
        code: { $first: "$sourceDetails.code" },
      },
    },
  ]);

  // Aggregate liabilities directly from Liability model with source lookup
  const liabilityMatch = {};
  if (dateFilter) liabilityMatch.date = dateFilter;

  const liabilityAggregation = await Liability.aggregate([
    { $match: liabilityMatch },
    {
      $lookup: {
        from: LiabilitySource.collection.name,
        localField: "source",
        foreignField: "_id",
        as: "sourceDetails",
      },
    },
    { $unwind: { path: "$sourceDetails", preserveNullAndEmptyArrays: true } },
    // Aggregate liabilities: sum in paisa
    {
      $group: {
        _id: "$source",
        totalAmountPaisa: { $sum: "$amountPaisa" },
        name: { $first: "$sourceDetails.name" },
        code: { $first: "$sourceDetails.code" },
      },
    },
  ]);

  // We still leverage ledger for expense totals (until a dedicated expense model exists)
  const ledgerSummary = await ledgerService.getLedgerSummary({
    startDate,
    endDate,
    nepaliYear,
    quarter,
  });

  const accounts = ledgerSummary.accounts || [];
  const byType = (type) =>
    accounts.filter(
      (acc) => acc.accountType === type || acc.accountDetails?.type === type,
    );
  const sumNet = (list) =>
    list.reduce((sum, acc) => sum + (acc.netBalance || 0), 0);

  const expenseAccounts = byType("EXPENSE");
  const totalExpenses = sumNet(expenseAccounts);

  // Convert paisa aggregations to rupees at the service boundary.
  // NOTE: ledger expenses (totalExpenses) come from ledgerService which returns
  // values already in rupees. Revenue and liabilities are stored in paisa and
  // converted here — keep this conversion centralised so callers always receive rupees.
  const totalRevenue = revenueAggregation.reduce(
    (sum, item) => sum + paisaToRupees(item.totalAmountPaisa || 0),
    0,
  );
  const totalLiabilities = liabilityAggregation.reduce(
    (sum, item) => sum + paisaToRupees(item.totalAmountPaisa || 0),
    0,
  );

  const netCashFlow = totalRevenue - totalExpenses;

  const camelKey = (name = "") =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ""))
      .replace(/[^a-z0-9]/g, "");

  const incomeStreams = revenueAggregation.reduce(
    (streams, item) => {
      const name = item.name || item.code || "revenue";
      const key = camelKey(name) || "revenue";
      const amount = paisaToRupees(item.totalAmountPaisa || 0);

      streams.breakdown.push({
        code: item.code,
        name,
        amount,
      });

      // Keep legacy keys for common codes so the dashboard stays backwards compatible
      if (item.code === "RENT") streams.rentRevenue = amount;
      if (item.code === "PARKING") streams.parkingRevenue = amount;
      if (item.code === "AD") streams.otherRevenue = amount;

      streams[key] = (streams[key] || 0) + amount;
      return streams;
    },
    { breakdown: [] },
  );

  const liabilitiesBreakdown = liabilityAggregation.map((item) => ({
    code: item.code,
    name: item.name || item.code || "liability",
    amount: Math.abs(paisaToRupees(item.totalAmountPaisa || 0)),
  }));

  // Build dynamic expense breakdown from ledger summary accounts
  // `expenseAccounts` items come from ledgerService.getLedgerSummary and have:
  // - accountCode
  // - accountName
  // - accountType
  const expensesBreakdown = expenseAccounts.map((item) => ({
    code: item.accountCode,
    name: item.accountName || item.accountCode || "expense",
    amount: Math.abs(item.netBalance || 0),
  }));

  return {
    totals: {
      totalRevenue,
      totalLiabilities,
      totalExpenses,
      netCashFlow,
    },
    incomeStreams,
    liabilitiesBreakdown,
    ledger: ledgerSummary,
    expensesBreakdown,
  };
}
