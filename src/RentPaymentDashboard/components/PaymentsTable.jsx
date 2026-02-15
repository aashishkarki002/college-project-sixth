import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { PaymentTableRow } from "./PaymentTableRow";

/**
 * Component for displaying payments table
 */
export const PaymentsTable = ({ payments }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Payment Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Payment Method</TableHead>
          <TableHead>Payment Status</TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center text-muted-foreground"
            >
              No payments found
            </TableCell>
          </TableRow>
        ) : (
          payments.map((payment, idx) => (
            <PaymentTableRow key={payment._id || idx} payment={payment} />
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default PaymentsTable;
