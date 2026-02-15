// pages/AccountingPage.jsx
import React, { useState } from "react";
import {
    AArrowUpIcon as BanknoteArrowUpIcon,
    AArrowDownIcon as BanknoteArrowDownIcon,
    BanknoteIcon,
    GitCompareArrowsIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    MinusIcon,
} from "lucide-react";
import {
    Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAccounting, useBankAccounts } from "../hooks/useAccounting";
import { useMonthlyChart, QUARTER_LABELS } from "../hooks/useMonthlyChart";

import LedgerTable from "./LedgerTable";
import DualCalendarTailwind from "../../components/dualDate";
import RevenueBreakDown from "./RevenueBreakDown";
import ExpenseBreakDown from "./ExpenseBreakDown";
import RevenueExpensesChart from "./RevenueExpensesChart";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUARTERS = [
    { label: "All", value: null },
    { label: "Q1", value: 1 },
    { label: "Q2", value: 2 },
    { label: "Q3", value: 3 },
    { label: "Q4", value: 4 },
];

// ─── KPI metric card ──────────────────────────────────────────────────────────

function MetricCard({ title, value, delta, deltaColor, icon: Icon, iconColor }) {
    return (
        <Card className="w-full md:w-1/3">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {title}
                    </span>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                    ₹{value.toLocaleString()}
                </p>
            </CardContent>
            <CardFooter className="pt-0">
                <p className={`text-xs font-medium ${deltaColor}`}>{delta}</p>
            </CardFooter>
        </Card>
    );
}

// ─── Delta badge helper ───────────────────────────────────────────────────────

function DeltaBadge({ pct }) {
    if (pct === null || pct === undefined) {
        return <Badge variant="secondary" className="text-xs gap-1"><MinusIcon className="w-3 h-3" />N/A</Badge>;
    }
    const up = pct >= 0;
    const Icon = up ? TrendingUpIcon : TrendingDownIcon;
    const color = up ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(pct).toFixed(1)}%
        </span>
    );
}

// ─── Comparison stats strip ───────────────────────────────────────────────────
/**
 * Shown below the chart when compare mode is active.
 * Industry pattern: surface the most important deltas immediately —
 * don't make the user calculate them.
 */
function ComparisonStats({ stats, labelA, labelB }) {
    if (!stats) return null;

    const rows = [
        { title: "Revenue", key: "revenue", aColor: "text-emerald-600", bColor: "text-cyan-600" },
        { title: "Expenses", key: "expenses", aColor: "text-rose-500", bColor: "text-orange-500" },
        { title: "Net Cash Flow", key: "netCashFlow", aColor: "text-foreground", bColor: "text-foreground" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {rows.map(({ title, key, aColor, bColor }) => {
                const s = stats[key];
                return (
                    <Card key={key} className="border-dashed">
                        <CardHeader className="pb-1 pt-4 px-4">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                            {/* Period values */}
                            <div className="flex items-end justify-between gap-2">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-muted-foreground">{labelA}</p>
                                    <p className={`text-base font-bold tabular-nums ${aColor}`}>
                                        ₹{s.a.toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-muted-foreground/40 text-lg font-light pb-1">→</div>
                                <div className="space-y-0.5 text-right">
                                    <p className="text-[10px] text-muted-foreground">{labelB}</p>
                                    <p className={`text-base font-bold tabular-nums ${bColor}`}>
                                        ₹{s.b.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Delta */}
                            <div className="flex items-center gap-2 pt-1 border-t border-border">
                                <DeltaBadge pct={s.pct} />
                                <span className="text-xs text-muted-foreground">
                                    {s.pct === null
                                        ? "No baseline data"
                                        : s.pct >= 0
                                            ? `${title} up by ${Math.abs(s.b - s.a).toLocaleString()} ₹`
                                            : `${title} down by ${Math.abs(s.b - s.a).toLocaleString()} ₹`}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// ─── Quarter selector strip ───────────────────────────────────────────────────

function QuarterStrip({ value, onChange, excludeValue, label }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-0.5">
                {label}
            </span>
            <div className="flex flex-wrap gap-1.5">
                {QUARTERS.map(({ label: qLabel, value: qValue }) => (
                    <Button
                        key={qLabel}
                        variant={value === qValue ? "default" : "outline"}
                        size="sm"
                        className="min-w-[3.5rem] h-8 text-xs font-medium"
                        disabled={qValue !== null && qValue === excludeValue}
                        onClick={() => onChange(qValue)}
                    >
                        {qLabel}
                    </Button>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountingPage() {
    const [selectedQuarter, setSelectedQuarter] = useState(null);
    const [activeTab, setActiveTab] = useState("summary");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Compare mode state
    const [compareMode, setCompareMode] = useState(false);
    const [compareQuarter, setCompareQuarter] = useState(2); // default to Q2

    // When user exits compare mode, clear compareQuarter
    const handleToggleCompare = () => {
        setCompareMode((prev) => !prev);
    };

    const activeCompareQuarter = compareMode ? compareQuarter : null;

    // Ledger type driven by active tab
    const ledgerType = activeTab === "Revenue" ? "revenue"
        : activeTab === "Expenses" ? "expense"
            : "all";

    const { summary, loadingSummary, ledgerEntries, loadingLedger } =
        useAccounting(selectedQuarter, ledgerType);

    const { bankAccounts } = useBankAccounts();

    const { chartData, compareData, comparisonStats, loadingChart } =
        useMonthlyChart(selectedQuarter, activeCompareQuarter);

    // ── Derived totals ──────────────────────────────────────────────────────────
    const totals = summary?.totals ?? {
        totalRevenue: 0, totalLiabilities: 0, totalExpenses: 0, netCashFlow: 0,
    };

    const incomeStreams = summary?.incomeStreams?.breakdown ?? [];
    const expenses = summary?.expensesBreakdown ?? [];

    // ── Period labels for comparison stats ─────────────────────────────────────
    const periodALabel = selectedQuarter ? QUARTER_LABELS[selectedQuarter] ?? "Period A" : "Last 5 months";
    const periodBLabel = compareQuarter ? QUARTER_LABELS[compareQuarter] ?? "Period B" : "Last 5 months";

    // ── Chart subtitle ──────────────────────────────────────────────────────────
    const chartSubtitle = compareMode
        ? `Comparing ${periodALabel} vs ${periodBLabel}`
        : selectedQuarter && selectedQuarter !== "custom"
            ? `Q${selectedQuarter} — 3-month view · FY 2081/82`
            : "Last 5 months · FY 2081/82";

    return (
        <div className="space-y-6 px-1">

            {/* ── Header + bank accounts ───────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Accounting</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Fiscal Year: 2081/82</p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                    {bankAccounts.map((account) => (
                        <Card key={account._id} className="hover:bg-muted/60 transition-colors cursor-pointer min-w-[160px]">
                            <CardHeader className="py-3 px-4">
                                <CardTitle className="text-sm font-semibold leading-none">{account.bankName}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center justify-between gap-4">
                                        <span>•••• {account.accountNumber?.slice(-3)}</span>
                                        <span className="font-medium tabular-nums">₹{account.balance.toLocaleString()}</span>
                                    </span>
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>

            {/* ── Period + compare controls ─────────────────────────────────────── */}
            <div className="space-y-3">
                {/* Primary period row */}
                <div className="flex flex-wrap items-end gap-3">

                    {compareMode ? (
                        /* Two-column quarter selectors in compare mode */
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <QuarterStrip
                                label="Period A"
                                value={selectedQuarter}
                                onChange={setSelectedQuarter}
                                excludeValue={compareQuarter}
                            />

                            {/* Visual separator */}
                            <div className="hidden sm:flex items-center self-end pb-1 text-muted-foreground/40">
                                <span className="text-lg font-light">vs</span>
                            </div>

                            <QuarterStrip
                                label="Period B"
                                value={compareQuarter}
                                onChange={setCompareQuarter}
                                excludeValue={selectedQuarter}
                            />
                        </div>
                    ) : (
                        /* Standard quarter buttons */
                        <div className="flex flex-wrap gap-2">
                            {QUARTERS.map(({ label, value }) => (
                                <Button
                                    key={label}
                                    variant={selectedQuarter === value ? "default" : "outline"}
                                    size="sm"
                                    className="min-w-[3.5rem] font-medium"
                                    onClick={() => setSelectedQuarter(value)}
                                >
                                    {label}
                                </Button>
                            ))}

                            {/* Custom range picker */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={selectedQuarter === "custom" ? "default" : "outline"}
                                        size="sm"
                                        className="font-medium"
                                    >
                                        Custom
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="p-4 w-auto min-w-[360px]">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                        Custom Range
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Start</label>
                                            <DualCalendarTailwind value={customStartDate} onChange={(e) => setCustomStartDate(e ?? "")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">End</label>
                                            <DualCalendarTailwind value={customEndDate} onChange={(e) => setCustomEndDate(e ?? "")} />
                                        </div>
                                    </div>
                                    <Button size="sm" className="mt-4 w-full" onClick={() => setSelectedQuarter("custom")}>
                                        Apply
                                    </Button>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Compare toggle — always visible */}
                    <Button
                        variant={compareMode ? "default" : "outline"}
                        size="sm"
                        className="gap-2 font-medium shrink-0"
                        onClick={handleToggleCompare}
                    >
                        <GitCompareArrowsIcon className="w-4 h-4" />
                        {compareMode ? "Exit Compare" : "Compare"}
                    </Button>
                </div>

                {/* Compare mode hint */}
                {compareMode && (
                    <p className="text-xs text-muted-foreground">
                        Select two different periods above. Same period is disabled to prevent identical comparison.
                    </p>
                )}
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="Revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="Expenses">Expenses</TabsTrigger>
                </TabsList>

                {/* ── Summary Tab ────────────────────────────────────────────────── */}
                <TabsContent value="summary" className="mt-6 space-y-6">

                    {/* KPI cards — hidden in compare mode (comparison stats replace them) */}
                    {!compareMode && (
                        <div className="flex flex-col md:flex-row gap-4">
                            <MetricCard
                                title="Total Gross Revenue"
                                value={totals.totalRevenue}
                                delta={`+₹${totals.totalRevenue.toLocaleString()} this period`}
                                deltaColor="text-emerald-600"
                                icon={BanknoteArrowUpIcon}
                                iconColor="text-emerald-500"
                            />
                            <MetricCard
                                title="Total Expenses"
                                value={totals.totalExpenses}
                                delta={`-₹${totals.totalExpenses.toLocaleString()} this period`}
                                deltaColor="text-rose-500"
                                icon={BanknoteArrowDownIcon}
                                iconColor="text-rose-500"
                            />
                            <MetricCard
                                title="Net Cash Flow"
                                value={totals.netCashFlow}
                                delta={`${totals.netCashFlow >= 0 ? "+" : ""}₹${totals.netCashFlow.toLocaleString()} this period`}
                                deltaColor={totals.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-500"}
                                icon={BanknoteIcon}
                                iconColor="text-blue-500"
                            />
                        </div>
                    )}

                    {/* Chart card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                                <div>
                                    <CardTitle className="text-base font-bold">
                                        {compareMode ? "Period Comparison" : "Income vs Expenses"}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">{chartSubtitle}</p>
                                </div>

                                {/* Period A / B legend badges in compare mode */}
                                {compareMode && (
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                            <span className="w-2 h-2 rounded-sm bg-emerald-500" /> A: {periodALabel}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                                            <span className="w-2 h-2 rounded-sm bg-cyan-500" /> B: {periodBLabel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <RevenueExpensesChart
                                data={chartData}
                                compareData={compareData}
                                loading={loadingChart}
                            />

                            {/* Comparison stat cards — rendered inside chart card for visual grouping */}
                            {compareMode && comparisonStats && (
                                <ComparisonStats
                                    stats={comparisonStats}
                                    labelA={periodALabel}
                                    labelB={periodBLabel}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Ledger table */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold">Ledger Entries</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LedgerTable entries={ledgerEntries} loading={loadingLedger} itemsPerPage={20} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Revenue Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="Revenue" className="mt-6">
                    <RevenueBreakDown
                        totals={totals}
                        incomeStreams={incomeStreams}
                        ledgerEntries={ledgerEntries}
                        loadingSummary={loadingSummary}
                        loadingLedger={loadingLedger}
                    />
                </TabsContent>

                {/* ── Expenses Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="Expenses" className="mt-6">
                    <ExpenseBreakDown
                        expenses={expenses}
                        ledgerEntries={ledgerEntries}
                        loadingSummary={loadingSummary}
                        loadingLedger={loadingLedger}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}