import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
  
export default function RevenueLiabilitiesChart({ data = [], loading = false }) {
  const chartData = data.length
    ? data
    : [
        { label: "No Data", revenue: 0, liabilities: 0 },
      ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs Liabilities</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--green-500))"
 radius={[4, 4, 0, 0]} 
 className="text-green-500"
 />
                <Bar dataKey="liabilities" fill="hsl(var(--red-500))" radius={[4, 4, 0, 0]} 
                className="text-red-500"
                />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
