// hooks/useMonthlyChart.js
import { useState, useEffect } from "react";
import NepaliDate from "nepali-datetime";
import api from "../../../plugins/axios";

export const NEPALI_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

/**
 * Nepal fiscal year quarters (Shrawan-based):
 *   Q1 → Shrawan(3),  Bhadra(4),   Ashwin(5)
 *   Q2 → Kartik(6),   Mangsir(7),  Poush(8)
 *   Q3 → Magh(9),     Falgun(10),  Chaitra(11)
 *   Q4 → Baisakh(0),  Jestha(1),   Ashadh(2)
 */
export const FISCAL_QUARTER_MONTHS = {
  1: [3, 4, 5],
  2: [6, 7, 8],
  3: [9, 10, 11],
  4: [0, 1, 2],
};

export const QUARTER_LABELS = {
  1: "Q1 (Shrawan–Ashwin)",
  2: "Q2 (Kartik–Poush)",
  3: "Q3 (Magh–Chaitra)",
  4: "Q4 (Baisakh–Ashadh)",
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getNepaliMonthRange(year, month0) {
  const firstNp = new NepaliDate(year, month0, 1);
  const lastDay = NepaliDate.getDaysOfMonth(year, month0);
  const lastNp = new NepaliDate(year, month0, lastDay);
  const toISO = (d) => d.getDateObject().toISOString().split("T")[0];
  return {
    startDate: toISO(firstNp),
    endDate: toISO(lastNp),
    label: NEPALI_MONTH_NAMES[month0],
  };
}

function getLastNMonths(n = 5) {
  const now = new NepaliDate();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    let month0 = now.getMonth() - i;
    let year = now.getYear();
    while (month0 < 0) {
      month0 += 12;
      year -= 1;
    }
    months.push({ year, month0 });
  }
  return months;
}

function getQuarterMonthList(quarter, fiscalYear) {
  const now = new NepaliDate();
  const year = fiscalYear ?? now.getYear();
  return FISCAL_QUARTER_MONTHS[quarter].map((month0) => ({ year, month0 }));
}

async function fetchMonthSummary(year, month0) {
  const { startDate, endDate, label } = getNepaliMonthRange(year, month0);
  try {
    const res = await api.get("/api/accounting/summary", {
      params: { startDate, endDate },
    });
    const data = res.data?.data;
    return {
      label,
      revenue: data?.totals?.totalRevenue ?? 0,
      expenses: data?.totals?.totalExpenses ?? 0,
      liabilities: data?.totals?.totalLiabilities ?? 0,
    };
  } catch {
    return { label, revenue: 0, expenses: 0, liabilities: 0 };
  }
}

async function fetchPeriod(quarter, fiscalYear) {
  const months =
    quarter && quarter !== "custom"
      ? getQuarterMonthList(quarter, fiscalYear)
      : getLastNMonths(5);
  return Promise.all(
    months.map(({ year, month0 }) => fetchMonthSummary(year, month0)),
  );
}

/** Returns % change; null when base is 0 to avoid divide-by-zero */
function pctChange(base, next) {
  if (!base) return null;
  return ((next - base) / base) * 100;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useMonthlyChart
 *
 * Normal mode  → chartData: [{ label, revenue, expenses, liabilities }]
 * Compare mode → compareData: [{ label, labelA, labelB, revenueA, revenueB, expensesA, expensesB }]
 *             → comparisonStats: { revenue, expenses, netCashFlow } each: { a, b, pct }
 *
 * @param {number|string|null} selectedQuarter  Primary period (null = last 5 months)
 * @param {number|string|null} compareQuarter   Secondary period (null = compare off)
 * @param {number}             [fiscalYear]     Override Nepali year
 */
export function useMonthlyChart(
  selectedQuarter,
  compareQuarter = null,
  fiscalYear,
) {
  const [chartData, setChartData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);

  const isCompare = compareQuarter !== null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingChart(true);

      if (isCompare) {
        // Fetch both periods in parallel — standard pattern for comparison dashboards
        const [periodA, periodB] = await Promise.all([
          fetchPeriod(selectedQuarter, fiscalYear),
          fetchPeriod(compareQuarter, fiscalYear),
        ]);

        if (cancelled) return;

        // Merge positionally: Month 1 of A paired with Month 1 of B
        const merged = periodA.map((a, i) => ({
          label: `${a.label} / ${periodB[i]?.label ?? "–"}`,
          labelA: a.label,
          labelB: periodB[i]?.label ?? "–",
          revenueA: a.revenue,
          revenueB: periodB[i]?.revenue ?? 0,
          expensesA: a.expenses,
          expensesB: periodB[i]?.expenses ?? 0,
        }));

        // Aggregate totals for comparison stat cards
        const sum = (arr, key) => arr.reduce((s, x) => s + (x[key] ?? 0), 0);
        const totalARevenue = sum(periodA, "revenue");
        const totalBRevenue = sum(periodB, "revenue");
        const totalAExpenses = sum(periodA, "expenses");
        const totalBExpenses = sum(periodB, "expenses");
        const totalANet = totalARevenue - totalAExpenses;
        const totalBNet = totalBRevenue - totalBExpenses;

        setCompareData(merged);
        setComparisonStats({
          revenue: {
            a: totalARevenue,
            b: totalBRevenue,
            pct: pctChange(totalARevenue, totalBRevenue),
          },
          expenses: {
            a: totalAExpenses,
            b: totalBExpenses,
            pct: pctChange(totalAExpenses, totalBExpenses),
          },
          netCashFlow: {
            a: totalANet,
            b: totalBNet,
            pct: pctChange(totalANet, totalBNet),
          },
        });
        setChartData([]);
      } else {
        const results = await fetchPeriod(selectedQuarter, fiscalYear);
        if (!cancelled) {
          setChartData(results);
          setCompareData([]);
          setComparisonStats(null);
        }
      }

      if (!cancelled) setLoadingChart(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedQuarter, compareQuarter, fiscalYear]);

  return { chartData, compareData, comparisonStats, loadingChart };
}
