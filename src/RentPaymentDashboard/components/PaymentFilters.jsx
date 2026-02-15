import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import DualCalendarTailwind from "../../components/dualDate";

/**
 * Component for payment history filters
 */
export const PaymentFilters = ({
  filterStartDate,
  filterEndDate,
  filterPaymentMethod,
  setFilterStartDate,
  setFilterEndDate,
  setFilterPaymentMethod,
  datePickerResetKey,
  onReset,
}) => {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        {/* Date Range Filter */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <DualCalendarTailwind
              key={`start-${datePickerResetKey}`}
              onChange={(english, nepali) => {
                setFilterStartDate(english || "");
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <DualCalendarTailwind
              key={`end-${datePickerResetKey}`}
              onChange={(english, nepali) => {
                setFilterEndDate(english || "");
              }}
            />
          </div>
        </div>
        {/* Payment Method Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium mb-2">
            Payment Method
          </label>
          <Select
            value={filterPaymentMethod}
            onValueChange={(value) => setFilterPaymentMethod(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Clear Filter Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="w-full sm:w-auto"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
