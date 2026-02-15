import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpenseInfoStep({ formik, expenseSources }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="source">Expense source / category</Label>
        <Select
          value={formik.values.source ?? ""}
          onValueChange={(value) => formik.setFieldValue("source", value)}
        >
          <SelectTrigger id="source" className="w-full">
            <SelectValue placeholder="Select expense source" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(expenseSources) &&
              expenseSources.map((src) => (
                <SelectItem key={src._id} value={src._id}>
                  {src.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referenceType">Reference type</Label>
          <Select
            value={formik.values.referenceType ?? "MANUAL"}
            onValueChange={(value) =>
              formik.setFieldValue("referenceType", value)
            }
          >
            <SelectTrigger id="referenceType" className="w-full">
              <SelectValue placeholder="Reference type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="UTILITY">Utility</SelectItem>
              <SelectItem value="SALARY">Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceId">Reference ID (if applicable)</Label>
          <Input
            id="referenceId"
            placeholder="Reference ID"
            value={formik.values.referenceId ?? ""}
            onChange={(e) =>
              formik.setFieldValue("referenceId", e.target.value)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ₹
          </span>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formik.values.amount ?? ""}
            onChange={(e) => formik.setFieldValue("amount", e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Optional notes"
          value={formik.values.notes ?? ""}
          onChange={(e) => formik.setFieldValue("notes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
