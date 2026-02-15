import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEPALI_MONTHS, getCurrentNepaliMonthYear } from "@/constants/nepaliMonths";
import { parseNepaliMonthString } from "../utils/electricityCalculations";

const CURRENT = getCurrentNepaliMonthYear();
const NEPALI_YEARS = Array.from(
  { length: 15 },
  (_, i) => CURRENT.year - 5 + i
);

/**
 * Block, inner block, month, and compare-with-previous filter controls.
 * Controlled via filterValues and onChange callbacks.
 */
export function ElectricityFilters({
  filterValues,
  onChange,
  allBlocks = [],
  availableInnerBlocks = [],
}) {
  const { blockId, innerBlockId, nepaliMonth, compareWithPrevious } =
    filterValues ?? {};

  const { monthValue, yearValue } = useMemo(() => {
    const parsed = parseNepaliMonthString(nepaliMonth?.trim());
    if (parsed) return { monthValue: parsed.month, yearValue: parsed.year };
    return { monthValue: CURRENT.month, yearValue: CURRENT.year };
  }, [nepaliMonth]);

  const handleNepaliMonthChange = (monthOrYear, value) => {
    const nextMonth = monthOrYear === "month" ? value : monthValue;
    const nextYear = monthOrYear === "year" ? value : yearValue;
    const label = NEPALI_MONTHS.find((m) => m.value === nextMonth)?.label ?? "Baisakh";
    onChange?.("nepaliMonth", `${label} ${nextYear}`);
  };

  return (
    <Card className="rounded-lg shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-center gap-6 flex-wrap">
          {/* BLOCK */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">
              BLOCK:
            </label>
            <Select
              value={blockId ?? ""}
              onValueChange={(value) => {
                onChange?.("blockId", value);
                onChange?.("innerBlockId", "");
              }}
            >
              <SelectTrigger className="w-[150px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                <SelectValue placeholder="Select block" />
              </SelectTrigger>
              <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                {allBlocks.length > 0 ? (
                  allBlocks.map((block) => (
                    <SelectItem key={block._id} value={block._id}>
                      {block.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-block" disabled>
                    No blocks available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* INNER BLOCK */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">
              INNER BLOCK:
            </label>
            <Select
              value={innerBlockId ?? ""}
              onValueChange={(value) => onChange?.("innerBlockId", value)}
              disabled={!blockId}
            >
              <SelectTrigger className="w-[130px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                <SelectValue placeholder="Select inner block" />
              </SelectTrigger>
              <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                {availableInnerBlocks.length > 0 ? (
                  availableInnerBlocks.map((innerBlock) => (
                    <SelectItem key={innerBlock._id} value={innerBlock._id}>
                      {innerBlock.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-inner-block" disabled>
                    {blockId
                      ? "No inner blocks available"
                      : "Select block first"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* NEPALI MONTH */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">
              NEPALI MONTH:
            </label>
            <div className="flex gap-2">
              <Select
                value={String(monthValue)}
                onValueChange={(value) => handleNepaliMonthChange("month", Number(value))}
              >
                <SelectTrigger className="w-[130px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                  {NEPALI_MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(yearValue)}
                onValueChange={(value) => handleNepaliMonthChange("year", Number(value))}
              >
                <SelectTrigger className="w-[90px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                  {NEPALI_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compare with Previous */}
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold uppercase tracking-wide">
              Compare with Previous
            </label>
            <button
              type="button"
              onClick={() =>
                onChange?.("compareWithPrevious", !compareWithPrevious)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-slate-800 ${compareWithPrevious ? "bg-blue-500" : "bg-gray-200"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${compareWithPrevious ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
