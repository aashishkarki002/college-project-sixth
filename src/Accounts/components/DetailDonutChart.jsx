

import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



const DEFAULT_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
];

export default function DetailDonutChart({
    data,
    title,
    currency = "₹",
    loading = false,
    colors = DEFAULT_COLORS,
}) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-80">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-80">
                    <p className="text-muted-foreground">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        name: item.name || item.code || "Unknown",
        value: item.amount,
    }));

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-2xl font-bold text-foreground mt-2">
                    {currency}
                    {total.toLocaleString()}
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                        >
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => `${currency}${value.toLocaleString()}`}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>

                {/* Detailed breakdown */}
                <div className="mt-6 space-y-3">
                    <h4 className="font-semibold text-sm">Breakdown:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.map((item, index) => (
                            <div
                                key={item.code || index}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: colors[index % colors.length],
                                        }}
                                    />
                                    <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-sm">
                                        {currency}
                                        {item.amount.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {((item.amount / total) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
