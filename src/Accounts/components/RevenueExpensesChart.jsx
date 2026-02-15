// components/RevenueExpensesChart.jsx
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Colours ─────────────────────────────────────────────────────────────────
// Period A: emerald (revenue) + rose (expenses)
// Period B: cyan (revenue) + amber (expenses)
// Industry convention: keep hue families distinct so colour-blind users can still
// distinguish the two periods without relying on saturation alone.
const COLORS = {
    revenueA: "#10b981",   // emerald-500
    revenueB: "#06b6d4",   // cyan-500
    expensesA: "#f43f5e",   // rose-500
    expensesB: "#f97316",   // orange-500
    revenue: "#10b981",
    expenses: "#f43f5e",
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ChartSkeleton() {
    return (
        <div className="w-full h-80 flex items-end gap-3 px-8 pb-8 pt-4 animate-pulse">
            {[60, 85, 45, 72, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-2 items-center justify-end">
                    <div className="w-full rounded-t-md bg-muted" style={{ height: `${h}%` }} />
                    <div className="h-2 w-10 rounded bg-muted" />
                </div>
            ))}
        </div>
    );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, isCompare }) {
    if (!active || !payload?.length) return null;

    // In compare mode the label is "Shrawan / Kartik" — split for visual clarity
    const [labelA, labelB] = isCompare ? label.split(" / ") : [label, null];

    return (
        <div className="rounded-xl border border-border bg-background/95 shadow-xl p-4 min-w-[200px] backdrop-blur-sm">
            {isCompare ? (
                <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">{labelA}</span>
                    <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">{labelB}</span>
                </div>
            ) : (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {label}
                </p>
            )}

            <div className="space-y-2">
                {payload.map((entry) => (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-sm text-foreground">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                            {entry.name}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                            ₹{Number(entry.value).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Custom legend ─────────────────────────────────────────────────────────────
function CustomLegend({ payload }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-5 pt-3">
            {payload?.map((entry) => (
                <div key={entry.value} className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-muted-foreground font-medium">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Y-axis formatter ─────────────────────────────────────────────────────────
const formatY = (v) => {
    if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v;
};

// ─── Main component ────────────────────────────────────────────────────────────
/**
 * RevenueExpensesChart
 *
 * @param {Array}   data         Normal mode: [{ label, revenue, expenses }]
 * @param {Array}   compareData  Compare mode: [{ label, revenueA, revenueB, expensesA, expensesB }]
 * @param {boolean} loading
 */
export default function RevenueExpensesChart({ data = [], compareData = [], loading = false }) {
    if (loading) return <ChartSkeleton />;

    const isCompare = compareData.length > 0;
    const chartData = isCompare ? compareData : data;

    if (!chartData?.length) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-2">
                <p className="text-sm font-medium text-foreground">No data available</p>
                <p className="text-xs text-muted-foreground">Select a period to see results</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={340}>
            <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="28%"
                barGap={3}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.6} />

                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    // Truncate long "Shrawan / Kartik" labels on small viewports
                    interval={0}
                    tickFormatter={(v) => (v.length > 16 ? v.replace(" / ", "/\n") : v)}
                />

                <YAxis
                    tickFormatter={formatY}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                />

                <Tooltip
                    content={<CustomTooltip isCompare={isCompare} />}
                    cursor={{ fill: "var(--muted)", opacity: 0.35, radius: 4 }}
                />

                <Legend content={<CustomLegend />} />

                {isCompare ? (
                    <>
                        {/* Revenue pair */}
                        <Bar dataKey="revenueA" name="Revenue (A)" fill={COLORS.revenueA} radius={[5, 5, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="revenueB" name="Revenue (B)" fill={COLORS.revenueB} radius={[5, 5, 0, 0]} maxBarSize={36} />
                        {/* Expenses pair */}
                        <Bar dataKey="expensesA" name="Expenses (A)" fill={COLORS.expensesA} radius={[5, 5, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="expensesB" name="Expenses (B)" fill={COLORS.expensesB} radius={[5, 5, 0, 0]} maxBarSize={36} />
                    </>
                ) : (
                    <>
                        <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[6, 6, 0, 0]} maxBarSize={52} />
                        <Bar dataKey="expenses" name="Expenses" fill={COLORS.expenses} radius={[6, 6, 0, 0]} maxBarSize={52} />
                    </>
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}