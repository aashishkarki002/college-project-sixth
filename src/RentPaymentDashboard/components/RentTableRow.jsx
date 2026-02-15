import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { formatNepaliDueDate } from "../utils/dateUtils";
import { getPaymentAmounts, normalizeStatus } from "../utils/paymentUtil";
import { statusStyles } from "../constants/paymentConstants";

/**
 * Component for rendering a single rent table row
 */
export const RentTableRow = ({ rent, cams, onOpenPaymentDialog }) => {
  const { rentAmount, camAmount, totalDue } = getPaymentAmounts(rent, cams);
  const status = normalizeStatus(rent.status);

  // Prefer rent-level frequency, fall back to tenant's configured frequency
  const rawFrequency = rent.rentFrequency || rent.tenant?.rentPaymentFrequency;
  const displayFrequency = rawFrequency
    ? rawFrequency.charAt(0).toUpperCase() + rawFrequency.slice(1)
    : "N/A";

  return (
    <TableRow key={rent._id}>
      <TableCell>
        <div className="font-medium">
          {rent.tenant ? rent.tenant.name : "No Tenant Assigned"}
        </div>
        <div className="text-sm text-muted-foreground">
          {rent.innerBlock?.name || "N/A"} - {rent.block?.name || "N/A"}-
          {rent.units?.map((unit) => unit.name).join(", ")}
        </div>
      </TableCell>
      <TableCell>{displayFrequency}</TableCell>
      <TableCell>₹{rentAmount.toLocaleString()}</TableCell>
      <TableCell>₹{camAmount.toLocaleString()}</TableCell>
      <TableCell>₹{totalDue.toLocaleString()}</TableCell>
      <TableCell>{formatNepaliDueDate(rent)}</TableCell>
      <TableCell>
        <Badge
          className={`capitalize border ${statusStyles[status] ||
            "bg-gray-100 text-gray-700 border-gray-300"
            }`}
        >
          {status === "partial" ? "Partially Paid" : status}
        </Badge>
      </TableCell>
      <TableCell>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={rent.status === "paid"}
              className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
              onClick={() => onOpenPaymentDialog(rent)}
            >
              {rent.status === "paid" ? "Paid" : "Record Payment"}
            </Button>
          </DialogTrigger>
        </Dialog>
      </TableCell>
    </TableRow>
  );
};
