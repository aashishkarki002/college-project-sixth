import React from "react";
import { CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RentFilter } from "./RentFilter";

/**
 * Component for displaying rent collection summary.
 *
 * totalCollected / totalDue are pre-scoped to the active frequency view
 * (monthly or quarterly) by the parent — this component is purely presentational.
 */
export const RentSummaryCard = ({
  totalCollected,
  totalDue,
  frequencyView,      // "monthly" | "quarterly"
  filterRentMonth,
  onMonthChange,
}) => {
  // Guard against divide-by-zero; clamp to [0, 100] for safety
  const progressPercentage =
    totalDue > 0 ? Math.min((totalCollected / totalDue) * 100, 100) : 0;

  const frequencyLabel =
    frequencyView === "quarterly" ? "Quarterly" : "Monthly";

  return (
    <div className="px-6 pt-6">
      <CardDescription className="text-gray-500 font-bold text-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="text-black font-bold text-xl">
            Track {frequencyLabel.toLowerCase()} rent collection
          </div>
          <RentFilter value={filterRentMonth} onMonthChange={onMonthChange} />
        </div>
      </CardDescription>

      <div className="mt-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between mb-1">
          <strong>
            {frequencyLabel} Collection
          </strong>
          {totalDue > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% collected
            </span>
          )}
        </div>

        {totalDue > 0 ? (
          <>
            <Progress value={progressPercentage} className="h-2 w-full mt-1" />
            <span className="text-primary font-bold mt-1 block">
              ₹{totalCollected.toLocaleString()} / ₹{totalDue.toLocaleString()}
            </span>
          </>
        ) : (
          /* No rents for this period — show a neutral empty-state bar */
          <>
            <Progress value={0} className="h-2 w-full mt-1 opacity-40" />
            <span className="text-muted-foreground text-xs mt-1 block">
              No {frequencyLabel.toLowerCase()} rents for the selected period
            </span>
          </>
        )}
      </div>
    </div>
  );
};