import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export function ExpensesTable({ expenses, loading }) {
  if (loading) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        Loading expenses…
      </div>
    );
  }

  if (!expenses?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <EmptyTitle>No expenses</EmptyTitle>
        <EmptyDescription>Add an expense using the button above</EmptyDescription>
      </div>
    );
  }

  const formatDate = (val) => {
    if (!val) return "—";
    if (typeof val === "string") return val.split("T")[0];
    return new Date(val).toISOString().split("T")[0];
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((exp) => (
          <TableRow key={exp._id}>
            <TableCell>{formatDate(exp.EnglishDate)}</TableCell>
            <TableCell>{exp.source?.name ?? exp.source ?? "—"}</TableCell>
            <TableCell className="text-right">₹ {exp.amount}</TableCell>
            <TableCell>{exp.referenceType ?? "—"}</TableCell>
            <TableCell className="max-w-[200px] truncate">{exp.notes ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
