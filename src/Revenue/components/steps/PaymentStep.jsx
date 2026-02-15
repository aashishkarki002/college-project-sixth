import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DualCalendarTailwind from "@/components/dualDate";

export function PaymentStep({ formik, bankAccounts }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="bankAccount">Bank Account</Label>
        <Select
          value={formik.values.bankAccount ?? ""}
          onValueChange={(value) =>
            formik.setFieldValue("bankAccount", value)
          }
        >
          <SelectTrigger id="bankAccount" className="w-full">
            <SelectValue placeholder="Select bank account" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(bankAccounts) &&
              bankAccounts.map((bank) => (
                <SelectItem key={bank._id} value={bank._id}>
                  {bank.bankName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Payment Date</Label>
        <DualCalendarTailwind
          value={formik.values.date ?? ""}
          onChange={(englishDate) => {
            formik.setFieldValue("date", englishDate);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Schedule (recurring)</Label>
        <Select
          value={formik.values.paymentSchedule ?? "one_time"}
          onValueChange={(value) =>
            formik.setFieldValue("paymentSchedule", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="One-time or recurring" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One-time</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
