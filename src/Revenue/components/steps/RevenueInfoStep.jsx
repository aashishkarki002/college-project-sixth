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

export function RevenueInfoStep({ formik, revenueSource }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referenceType">Reference Type</Label>
          <Select
            value={formik.values.referenceType ?? ""}
            onValueChange={(value) =>
              formik.setFieldValue("referenceType", value)
            }
          >
            <SelectTrigger id="referenceType" className="w-full">
              <SelectValue placeholder="Select reference type" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(revenueSource) &&
                revenueSource.map((source) => (
                  <SelectItem key={source._id} value={source._id}>
                    {source.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceId">Reference ID</Label>
          <Input
            id="referenceId"
            placeholder="Reference ID (optional)"
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
