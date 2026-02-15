import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { RentTableRow } from "./RentTableRow";
import { PaymentDialog } from "./PaymentDialog";

/**
 * Component for displaying rent table.
 * Shows an empty state when no rents match the active month / frequency filter.
 */
export const RentTable = ({
  rents,
  cams,
  bankAccounts,
  formik,
  allocationMode,
  setAllocationMode,
  rentAllocation,
  setRentAllocation,
  camAllocation,
  setCamAllocation,
  selectedBankAccountId,
  setSelectedBankAccountId,
  handleOpenDialog,
  handleAmountChange,
}) => {
  const [selectedRent, setSelectedRent] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleOpen = (rent) => {
    setSelectedRent(rent);
    handleOpenDialog(rent);
    setDialogOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant / Unit</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Rent Amount</TableHead>
            <TableHead>CAM Amount</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rents.length === 0 ? (
            /* Industry standard: use a full-width colSpan cell for empty states
               rather than rendering outside the table, to keep DOM structure valid. */
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-16 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-muted-foreground/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M3 21h18M12 3a4 4 0 100 8 4 4 0 000-8z"
                    />
                  </svg>
                  <p className="text-sm font-medium">No rents for this month</p>
                  <p className="text-xs text-muted-foreground/70">
                    Try selecting a different month or switching the frequency
                    filter.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rents.map((rent, idx) => (
              <RentTableRow
                key={rent._id || idx}
                rent={rent}
                cams={cams}
                onOpenPaymentDialog={handleOpen}
              />
            ))
          )}
        </TableBody>
      </Table>

      {/* Payment Dialog — only mounted when a rent is selected */}
      {selectedRent && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <PaymentDialog
            rent={selectedRent}
            cams={cams}
            bankAccounts={bankAccounts}
            formik={formik}
            allocationMode={allocationMode}
            setAllocationMode={setAllocationMode}
            rentAllocation={rentAllocation}
            setRentAllocation={setRentAllocation}
            camAllocation={camAllocation}
            setCamAllocation={setCamAllocation}
            selectedBankAccountId={selectedBankAccountId}
            setSelectedBankAccountId={setSelectedBankAccountId}
            handleAmountChange={handleAmountChange}
            onClose={() => setDialogOpen(false)}
          />
        </Dialog>
      )}
    </>
  );
};