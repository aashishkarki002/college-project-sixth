import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-right break-all">
        {value ?? "—"}
      </span>
    </div>
  );
}

export function ReviewStep({
  formik,
  tenants,
  expenseSources,
}) {
  const v = formik.values;
  const payeeType = v.payeeType ?? "tenant";

  const payeeLabel =
    payeeType === "tenant"
      ? tenants?.find((t) => t._id === v.tenantId)?.name ?? v.tenantId ?? "—"
      : v.externalPayeeName ?? "External";

  const sourceLabel =
    expenseSources?.find((s) => s._id === v.source)?.name ?? v.source ?? "—";

  const refTypeLabels = {
    MANUAL: "Manual",
    MAINTENANCE: "Maintenance",
    UTILITY: "Utility",
    SALARY: "Salary",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <h4 className="text-sm font-semibold">Summary</h4>
        </CardHeader>
        <CardContent className="space-y-0 text-sm">
          <Row
            label="Payee type"
            value={payeeType === "tenant" ? "Tenant" : "External"}
          />
          <Row label="Payee" value={payeeLabel} />
          <Row label="Expense source" value={sourceLabel} />
          <Row label="Reference type" value={refTypeLabels[v.referenceType]} />
          <Row label="Reference ID" value={v.referenceId} />
          <Row label="Amount" value={v.amount ? `₹ ${v.amount}` : "—"} />
          <Row label="Notes" value={v.notes} />
          <Row label="Date" value={v.date} />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-sm">
        Confirm the details above and submit to record the expense.
      </p>
    </div>
  );
}
