import React from "react";
import { Label } from "@/components/ui/label";
import DualCalendarTailwind from "@/components/dualDate";

export function PaymentStep({ formik }) {
  const handleDateChange = (englishDate, nepaliDateStr) => {
    formik.setFieldValue("date", englishDate);
    formik.setFieldValue("nepaliDateStr", nepaliDateStr ?? "");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Expense / payment date</Label>
        <DualCalendarTailwind
          value={formik.values.date ?? ""}
          onChange={handleDateChange}
        />
      </div>
    </div>
  );
}
