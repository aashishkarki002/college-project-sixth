import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

export function ReviewStep({ formik, tenants, bankAccounts, revenueSource }) {
  const v = formik.values;
  const payerType = v.payerType ?? "tenant";

  const payerLabel =
    payerType === "tenant"
      ? (tenants?.find((t) => t._id === v.tenantId)?.name ?? v.tenantId ?? "—")
      : `${v.externalPayerName ?? "—"} (${v.externalPayerType ?? "—"})`;

  const sourceLabel =
    revenueSource?.find((s) => s._id === v.referenceType)?.name ?? v.referenceType ?? "—";
  const bankLabel =
    bankAccounts?.find((b) => b._id === v.bankAccount)?.bankName ?? v.bankAccount ?? "—";

  const scheduleLabels = {
    one_time: "One-time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <h4 className="text-sm font-semibold">Summary</h4>
        </CardHeader>
        <CardContent className="space-y-0 text-sm">
          <Row label="Payer type" value={payerType === "tenant" ? "Tenant" : "External"} />
          <Row label="Payer" value={payerLabel} />
          <Row label="Reference type" value={sourceLabel} />
          <Row label="Reference ID" value={v.referenceId} />
          <Row label="Amount" value={v.amount ? `₹ ${v.amount}` : "—"} />
          <Row label="Notes" value={v.notes} />
          <Row label="Bank account" value={bankLabel} />
          <Row label="Payment date" value={v.date} />
          <Row
            label="Schedule"
            value={scheduleLabels[v.paymentSchedule] ?? v.paymentSchedule}
          />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-sm">
        Confirm the details above and submit to create the revenue record.
      </p>
    </div>
  );
}
