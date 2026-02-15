import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

/**
 * Summary cards: total consumption, avg per unit, total bill amount.
 */
export function ElectricitySummaryCards({ summary = {} }) {
  const {
    totalConsumption = 0,
    averageConsumption = 0,
    totalAmount = 0,
  } = summary;

  return (
    <div className="flex justify-between gap-4 mt-4">
      {/* TOTAL CONSUMPTION */}
      <Card className="rounded-lg shadow-lg w-full bg-white text-black">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
            TOTAL CONSUMPTION
          </CardTitle>
          <Zap className="w-5 h-5 text-black" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl font-bold">
            {totalConsumption}
            <span className="text-lg font-medium text-gray-500 align-top">
              {" "}
              kWh
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-semibold text-black">+5.2%</span>{" "}
            <span className="text-gray-500">vs last month</span>
          </p>
        </CardContent>
      </Card>

      {/* AVG. PER UNIT */}
      <Card className="rounded-lg shadow-lg w-full bg-white text-black">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
            AVG. PER UNIT
          </CardTitle>
          <Zap className="w-5 h-5 text-black" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl font-bold">
            {averageConsumption}{" "}
            <span className="text-lg font-medium text-gray-500 align-top">
              kWh/unit
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Average consumption per unit
          </p>
        </CardContent>
      </Card>

      {/* TOTAL BILL AMOUNT */}
      <Card className="rounded-lg shadow-lg w-full bg-white text-black">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
            TOTAL BILL AMOUNT
          </CardTitle>
          <Zap className="w-5 h-5 text-black" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl font-bold">Rs. {totalAmount}</div>
          <p className="mt-2 text-xs text-gray-500">
            Total amount for the selected period
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
