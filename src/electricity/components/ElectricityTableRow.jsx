import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Home,
  Upload,
  FileText,
} from "lucide-react";
import { getConsumption, getTrendPercent, formatConsumption } from "../utils/electricityCalculations";
import { FLAGGED_CONSUMPTION_THRESHOLD } from "../utils/electricityConstants";
import { recordPayment, updateReading } from "../utils/electricityApi";

/**
 * Status badge class by status string.
 */
function getStatusBadge(status) {
  switch (String(status).toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-orange-100 text-orange-700";
    case "overdue":
      return "bg-red-100 text-red-700";
    case "partially_paid":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "overdue", label: "Overdue" },
];

/**
 * Single existing electricity record row with status select and payment dialog.
 */
export function ElectricityTableRow({ record, index, onPaymentRecorded }) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const unitName =
    record.unit?.name ??
    record.unit?.unitName ??
    `Unit ${index + 1}`;
  const previousReading = Number(record.previousReading) || 0;
  const currentReading = Number(record.currentReading) || 0;
  const consumption = getConsumption(record);
  const status = record.status || "pending";
  const trend = getTrendPercent(consumption, previousReading);
  const trendColor = parseFloat(trend) > 0 ? "text-red-500" : "text-green-500";
  const trendSign = parseFloat(trend) > 0 ? "+" : "";
  const hasHighUsage = consumption > FLAGGED_CONSUMPTION_THRESHOLD;
  const billMedia = record.billMedia ?? record.receipt;

  const totalAmount = Number(record.totalAmount) || 0;
  const paidAmount = Number(record.paidAmount) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const openPaymentDialog = useCallback(() => {
    setPaymentAmount(String(remainingAmount > 0 ? remainingAmount : totalAmount));
    setPaymentDialogOpen(true);
  }, [remainingAmount, totalAmount]);

  const closePaymentDialog = useCallback(() => {
    setPaymentDialogOpen(false);
    setPaymentAmount("");
    setReceiptFile(null);
  }, []);

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (newStatus === status) return;
      if (newStatus === "paid" || newStatus === "partially_paid") {
        openPaymentDialog();
        return;
      }
      setUpdatingStatus(true);
      try {
        await updateReading(record._id, { status: newStatus });
        toast.success("Status updated.");
        onPaymentRecorded?.();
      } catch (err) {
        toast.error(err?.message || "Failed to update status.");
      } finally {
        setUpdatingStatus(false);
      }
    },
    [status, record._id, openPaymentDialog, onPaymentRecorded]
  );

  const handlePaymentSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const amount = parseFloat(paymentAmount);
      if (Number.isNaN(amount) || amount <= 0) {
        toast.error("Enter a valid amount.");
        return;
      }
      if (amount > remainingAmount) {
        toast.error(`Amount cannot exceed remaining due (Rs ${remainingAmount}).`);
        return;
      }
      setSavingPayment(true);
      try {
        await recordPayment(
          {
            electricityId: record._id,
            amount,
          },
          receiptFile || undefined
        );
        toast.success("Payment recorded.");
        closePaymentDialog();
        onPaymentRecorded?.();
      } catch (err) {
        toast.error(err?.message || "Failed to record payment.");
      } finally {
        setSavingPayment(false);
      }
    },
    [paymentAmount, remainingAmount, record._id, receiptFile, closePaymentDialog, onPaymentRecorded]
  );

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 ${hasHighUsage ? "relative" : ""}`}
      >
        <td className="py-3 px-4 relative">
          {hasHighUsage && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          )}
          <div
            className={`flex items-center gap-2 ${hasHighUsage ? "pl-2" : ""}`}
          >
            {hasHighUsage ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <Home className="w-4 h-4 text-gray-400" />
            )}
            <div>
              <div className="font-medium">{unitName}</div>
              {hasHighUsage && (
                <div className="text-xs text-red-500">HIGH USAGE ALERT</div>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-sm">
          {previousReading > 0 ? previousReading.toFixed(1) : "-"}
        </td>
        <td className="py-3 px-4 text-sm">
          {currentReading > 0 ? currentReading.toFixed(1) : "-"}
        </td>
        <td className="py-3 px-4">
          {consumption > 0 ? (
            <span className="text-sm font-medium text-blue-600">
              {formatConsumption(consumption)} kWh
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="py-3 px-4">
          <Select
            value={status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger
              className={`w-[130px] h-8 text-xs font-medium ${getStatusBadge(status)} border-0`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="py-3 px-4">
          {previousReading > 0 ? (
            <span className={`text-sm font-medium ${trendColor}`}>
              {trendSign}
              {trend}%
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="py-3 px-4">
          {billMedia?.url ? (
            <a
              href={billMedia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <FileText className="w-4 h-4 text-blue-500 cursor-pointer hover:text-blue-700" />
            </a>
          ) : (
            <Button
              type="button"
              className="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
              onClick={openPaymentDialog}
            >
              <Upload className="w-3 h-3" />
              UPLOAD
            </Button>
          )}
        </td>
      </tr>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record electricity payment</DialogTitle>
            <p className="text-sm text-gray-600">
              {unitName} — Total due: Rs {totalAmount.toLocaleString()}
              {paidAmount > 0 && (
                <span className="ml-1">(Paid: Rs {paidAmount.toLocaleString()})</span>
              )}
            </p>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="payment-amount">Amount (Rs)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
              {remainingAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining due: Rs {remainingAmount.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="receipt-upload">Receipt (optional)</Label>
              <Input
                id="receipt-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
                className="mt-1"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {receiptFile && (
                <p className="text-xs text-gray-600 mt-1">
                  {receiptFile.name}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closePaymentDialog}
                disabled={savingPayment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPayment}>
                {savingPayment ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
