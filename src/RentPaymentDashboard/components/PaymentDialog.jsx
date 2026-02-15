import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DualCalendarTailwind from "../../components/dualDate";
import { getPaymentAmounts, normalizeStatus } from "../utils/paymentUtil";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve a unit id to a plain string from ObjectId, populated doc, or string.
 * Mirrors resolveUnitId in rent-payment.helper.js for front-end parity.
 */
function resolveId(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

/**
 * Proportional allocation — mirrors allocatePaymentProportionally on the backend.
 * Returns [{ unitId: string, amount: number (rupees) }]
 */
function proportionalAllocate(unitBreakdown, totalRupees) {
  const totalRemainingPaisa = unitBreakdown.reduce((sum, u) => {
    return sum + Math.max(0, (u.rentAmountPaisa || 0) - (u.paidAmountPaisa || 0));
  }, 0);
  if (totalRemainingPaisa === 0) return [];

  const totalPaymentPaisa = Math.round(totalRupees * 100);
  let remaining = totalPaymentPaisa;
  const result = [];

  unitBreakdown.forEach((u, idx) => {
    const unitRemainingPaisa = (u.rentAmountPaisa || 0) - (u.paidAmountPaisa || 0);
    if (unitRemainingPaisa <= 0) return;

    let alloc;
    if (idx === unitBreakdown.length - 1) {
      alloc = remaining; // last unit absorbs rounding residue
    } else {
      alloc = Math.round((unitRemainingPaisa / totalRemainingPaisa) * totalPaymentPaisa);
      alloc = Math.min(alloc, unitRemainingPaisa);
    }

    if (alloc > 0) {
      result.push({ unitId: resolveId(u.unit), amount: alloc / 100 });
      remaining -= alloc;
    }
  });

  return result;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PaymentDialog = ({
  rent,
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
  handleAmountChange,
  onClose,
  relatedRents,
}) => {
  const { rentAmount, camAmount, totalDue } = getPaymentAmounts(rent, cams);

  // ── Find matching CAM record ─────────────────────────────────────────────
  // Industry standard: match CAM to rent by tenant + billing period
  const matchingCam = React.useMemo(() => {
    if (!cams?.length) return null;
    return (
      cams.find(
        (c) =>
          resolveId(c.tenant) === resolveId(rent?.tenant?._id || rent?.tenant) &&
          c.nepaliMonth === rent?.nepaliMonth &&
          c.nepaliYear === rent?.nepaliYear
      ) || cams[0] // fallback to first CAM if period-match unavailable
    );
  }, [cams, rent]);

  // ── Unit breakdown (multi-unit) ──────────────────────────────────────────
  /**
   * Industry standard: derive per-unit amounts from the server's unitBreakdown,
   * NOT by dividing the total equally. unitBreakdown holds the authoritative
   * rentAmountPaisa / paidAmountPaisa per unit set at rent creation time.
   */
  const units = React.useMemo(() => {
    const hasBreakdown =
      rent?.useUnitBreakdown && Array.isArray(rent.unitBreakdown) && rent.unitBreakdown.length > 0;

    if (hasBreakdown) {
      return rent.unitBreakdown.map((ub) => {
        const unit = ub.unit; // populated doc or ObjectId
        const id = resolveId(unit);
        const rentDue = (ub.rentAmountPaisa || 0) / 100;
        const paidSoFar = (ub.paidAmountPaisa || 0) / 100;
        const remaining = rentDue - paidSoFar;

        return {
          id,
          name: unit?.name || id || "Unit",
          label:
            unit?.block?.name
              ? `${unit.block.name} – ${unit.innerBlock?.name || ""}`.trim()
              : "",
          rentDue,
          paidSoFar,
          remaining,
          hasOutstanding: remaining > 0,
          // keep reference for payload building
          _breakdownRef: ub,
        };
      });
    }

    // Single-unit fallback
    const rentDue = rentAmount;
    const paidSoFar = (rent?.paidAmountPaisa || 0) / 100;
    return [
      {
        id: resolveId(rent?.units?.[0]) || rent?._id || "primary",
        name: rent?.units?.[0]?.name || "Primary Unit",
        label: `${rent?.innerBlock?.name || ""} ${rent?.block?.name || ""}`.trim(),
        rentDue,
        paidSoFar,
        remaining: rentDue - paidSoFar,
        hasOutstanding: rentDue - paidSoFar > 0,
        _breakdownRef: null,
      },
    ];
  }, [rent, rentAmount]);

  // ── Selected units ───────────────────────────────────────────────────────
  const [selectedUnitIds, setSelectedUnitIds] = React.useState(
    units.filter((u) => u.hasOutstanding).map((u) => u.id)
  );

  React.useEffect(() => {
    setSelectedUnitIds(units.filter((u) => u.hasOutstanding).map((u) => u.id));
  }, [rent?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedUnits = units.filter((u) => selectedUnitIds.includes(u.id));
  const allSelected = selectedUnitIds.length === units.length;

  // ── Per-unit rent allocation (manual mode) ───────────────────────────────
  /**
   * Industry standard: store allocation as rupees keyed by unitId.
   * On submit, these become unitAllocations[].amount in the payload.
   */
  const [unitRentAllocations, setUnitRentAllocations] = React.useState({});

  // Reset per-unit allocations when selected units change
  React.useEffect(() => {
    setUnitRentAllocations((prev) => {
      const next = {};
      selectedUnits.forEach((u) => {
        next[u.id] = prev[u.id] ?? u.remaining;
      });
      return next;
    });
  }, [selectedUnitIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived amounts ──────────────────────────────────────────────────────
  const paymentAmount = formik.values?.amount || 0;
  const totalAllocated = rentAllocation + camAllocation;
  const balanceOwed = totalDue - totalAllocated;
  const isOverAllocated = totalAllocated > paymentAmount && paymentAmount > 0;

  // Proportional auto-allocation preview (matches backend default strategy)
  const autoUnitAllocations = React.useMemo(() => {
    if (!rent?.useUnitBreakdown || !rent?.unitBreakdown?.length) return [];
    const selectedBreakdown = rent.unitBreakdown.filter((ub) =>
      selectedUnitIds.includes(resolveId(ub.unit))
    );
    if (!selectedBreakdown.length || !rentAllocation) return [];
    return proportionalAllocate(selectedBreakdown, rentAllocation);
  }, [rent, selectedUnitIds, rentAllocation]);

  // Manual per-unit total validation
  const manualUnitRentTotal = Object.values(unitRentAllocations).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );
  const unitAllocationMismatch =
    allocationMode === "manual" &&
    rent?.useUnitBreakdown &&
    Math.abs(manualUnitRentTotal - rentAllocation) > 0.01;

  // ── Payload builder ──────────────────────────────────────────────────────
  /**
   * Builds the exact API payload matching the /payments endpoint contract.
   * Industry standard: construct at submit time, not incrementally,
   * so the shape is always derived from latest state.
   */
  function buildPayload() {
    const isMultiUnit = rent?.useUnitBreakdown && rent?.unitBreakdown?.length > 0;

    const payload = {
      tenantId: resolveId(rent?.tenant?._id || rent?.tenant),
      amount: paymentAmount,
      paymentDate: formik.values?.paymentDate
        ? new Date(formik.values.paymentDate).toISOString().split("T")[0]
        : null,
      nepaliDate: formik.values?.nepaliDate || null,
      paymentMethod: formik.values?.paymentMethod,
      paymentStatus: "paid",
      note: formik.values?.note || "",
      bankAccountId: formik.values?.bankAccountId || null,
      transactionRef: formik.values?.transactionRef || null,
      allocations: {},
    };

    // ── Rent allocation ────────────────────────────────────────────────────
    if (rentAllocation > 0) {
      const rentEntry = {
        rentId: rent._id,
        amount: rentAllocation,
      };

      if (isMultiUnit) {
        // Attach per-unit allocations — use manual or proportional depending on mode
        const unitAllocations =
          allocationMode === "manual"
            ? selectedUnits
              .map((u) => ({
                unitId: u.id,
                amount: parseFloat(unitRentAllocations[u.id]) || 0,
              }))
              .filter((a) => a.amount > 0)
            : autoUnitAllocations.filter((a) =>
              selectedUnitIds.includes(a.unitId)
            );

        if (unitAllocations.length > 0) {
          rentEntry.unitAllocations = unitAllocations;
        }
      }

      payload.allocations.rent = rentEntry;
    }

    // ── CAM allocation ─────────────────────────────────────────────────────
    if (camAllocation > 0 && matchingCam?._id) {
      payload.allocations.cam = {
        camId: matchingCam._id,
        paidAmount: camAllocation,
      };
    }

    return payload;
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const isSubmitDisabled =
    !selectedUnits.length ||
    isOverAllocated ||
    !paymentAmount ||
    !formik.values?.paymentMethod ||
    !formik.values?.paymentDate ||
    unitAllocationMismatch;

  // ── Summary tone ─────────────────────────────────────────────────────────
  const summaryTone =
    balanceOwed === 0
      ? { container: "border-emerald-200 bg-emerald-50", accent: "text-emerald-700" }
      : balanceOwed > 0
        ? { container: "border-amber-200 bg-amber-50", accent: "text-amber-700" }
        : { container: "border-rose-200 bg-rose-50", accent: "text-rose-700" };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto bg-slate-50">
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-semibold text-slate-900">
          Record Payment
        </DialogTitle>
        <p className="text-sm text-slate-500 mt-1">
          Billing Period: {rent.nepaliMonth} {rent.nepaliYear}
        </p>
      </DialogHeader>

      {/* ── High-level due summary ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wide">
              Rent Due
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              ₹{rentAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wide">
              CAM Due
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              ₹{camAmount.toLocaleString()}
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-slate-900">Total Due</p>
          <p className="text-3xl font-semibold text-slate-900">
            ₹{totalDue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 1️⃣ Select Units ──────────────────────────────────────────────── */}
      <section className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Select Units</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose one or more units to include in this payment.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
              checked={allSelected}
              onChange={(e) =>
                setSelectedUnitIds(e.target.checked ? units.map((u) => u.id) : [])
              }
            />
            Select all units
          </label>
        </div>

        <div className="space-y-3">
          {units.map((unit) => {
            const selected = selectedUnitIds.includes(unit.id);
            return (
              <button
                key={unit.id}
                type="button"
                onClick={() =>
                  setSelectedUnitIds((prev) =>
                    prev.includes(unit.id)
                      ? prev.filter((id) => id !== unit.id)
                      : [...prev, unit.id]
                  )
                }
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${selected
                  ? "border-slate-900/80 bg-slate-900/[0.02]"
                  : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
              >
                {/* Top row: unit info + total due */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Circular selector indicator */}
                    <div
                      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${selected
                        ? "border-slate-900 bg-slate-900"
                        : "border-slate-300 bg-white"
                        }`}
                    >
                      {selected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {unit.name}
                      </p>
                      {unit.label && (
                        <p className="text-xs text-slate-500 mt-0.5">{unit.label}</p>
                      )}
                      {unit.hasOutstanding && (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Outstanding
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Total Due
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      ₹{unit.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Bottom row: per-unit amounts */}
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs flex justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Rent Due
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      ₹{unit.rentDue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Cam Due
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      ₹{unit.paidSoFar.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!selectedUnits.length && (
          <p className="text-xs text-slate-500">Select at least one unit to continue.</p>
        )}
      </section>

      {/* ── 2️⃣ Allocation Mode ───────────────────────────────────────────── */}
      <section className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Allocation Mode</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick Payment auto-distributes proportionally across units. Custom lets you
            specify exact amounts per unit.
          </p>
        </div>

        <Tabs
          value={allocationMode}
          onValueChange={setAllocationMode}
          className="space-y-5"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-0.5 rounded-full">
            <TabsTrigger
              value="auto"
              className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs font-medium"
            >
              Quick Payment
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs font-medium"
            >
              Custom Allocation
            </TabsTrigger>
          </TabsList>

          {/* ── 3️⃣ Quick Payment ────────────────────────────────────────── */}
          <TabsContent value="auto" className="space-y-4 pt-2">
            <div className="space-y-2">
              <label htmlFor="amount-quick" className="text-sm font-semibold text-slate-900">
                Amount to Pay (Rs)
              </label>
              <Input
                id="amount-quick"
                type="number"
                placeholder="Enter payment amount"
                value={formik.values?.amount || ""}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0, rent)}
                onBlur={(e) => {
                  if (!e.target.value) handleAmountChange(totalDue, rent);
                }}
                className="text-lg"
              />
              <p className="text-xs text-slate-500">
                If left blank, full due amount (₹{totalDue.toLocaleString()}) will be used.
              </p>
            </div>

            {/* Proportional preview — matches backend allocatePaymentProportionally */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Proportional allocation preview
                </p>
                <p className="text-xs text-slate-500">Weighted by remaining balance</p>
              </div>

              {autoUnitAllocations.length > 0 ? (
                <div className="space-y-2">
                  {autoUnitAllocations.map((alloc) => {
                    const unit = units.find((u) => u.id === alloc.unitId);
                    return (
                      <div
                        key={alloc.unitId}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-900">
                          {unit?.name || alloc.unitId}
                        </span>
                        <span className="font-semibold text-slate-900">
                          ₹{alloc.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                  {camAllocation > 0 && matchingCam && (
                    <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2 mt-1">
                      <span className="font-medium text-slate-500">CAM</span>
                      <span className="font-semibold text-slate-700">
                        ₹{camAllocation.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {selectedUnits.length === 0
                    ? "Select at least one unit to see allocation."
                    : "Enter an amount above to preview allocation."}
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── 4️⃣ Custom Allocation ─────────────────────────────────────── */}
          <TabsContent value="manual" className="space-y-4 pt-2">
            <div className="space-y-2">
              <label htmlFor="amount-manual" className="text-sm font-semibold text-slate-900">
                Total Amount to Pay (Rs)
              </label>
              <Input
                id="amount-manual"
                type="number"
                placeholder="Enter total payment amount"
                value={formik.values?.amount || ""}
                onChange={(e) =>
                  formik.setFieldValue("amount", parseFloat(e.target.value) || 0)
                }
                className="text-lg"
              />
            </div>

            {/* Global rent / CAM split */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="rent-allocation" className="text-sm font-semibold text-slate-900">
                  Allocate to Rent (Rs)
                </label>
                <Input
                  id="rent-allocation"
                  type="number"
                  placeholder="Rent amount"
                  value={rentAllocation}
                  onChange={(e) => setRentAllocation(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-500">Rent due: ₹{rentAmount.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="cam-allocation" className="text-sm font-semibold text-slate-900">
                  Allocate to CAM (Rs)
                </label>
                <Input
                  id="cam-allocation"
                  type="number"
                  placeholder="CAM amount"
                  value={camAllocation}
                  onChange={(e) => setCamAllocation(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-500">CAM due: ₹{camAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Per-unit rent allocation — only shown for multi-unit rents */}
            {rent?.useUnitBreakdown && selectedUnits.length > 0 && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Per-unit rent allocation
                  </p>
                  <p
                    className={`text-xs font-medium ${unitAllocationMismatch ? "text-rose-600" : "text-slate-500"
                      }`}
                  >
                    {unitAllocationMismatch
                      ? `Total ₹${manualUnitRentTotal.toFixed(2)} ≠ rent ₹${rentAllocation.toFixed(2)}`
                      : `Must sum to ₹${rentAllocation.toLocaleString()}`}
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedUnits.map((unit) => (
                    <div key={unit.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-900">{unit.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Remaining ₹
                          {unit.remaining.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-36 text-sm"
                        value={unitRentAllocations[unit.id] ?? ""}
                        placeholder="0"
                        max={unit.remaining}
                        onChange={(e) =>
                          setUnitRentAllocations((prev) => ({
                            ...prev,
                            [unit.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>

                {unitAllocationMismatch && (
                  <p className="text-xs text-rose-600">
                    Unit allocations must exactly match the rent allocation amount.
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                Rent and CAM allocations apply to all selected units in this billing cycle.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* ── 5️⃣ Payment Details ──────────────────────────────────────────── */}
      <section className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-900">Payment Details</p>

        {/* Payment Method */}
        <div className="space-y-2">
          <label htmlFor="payment-method" className="text-sm font-medium text-slate-900">
            Payment Method
          </label>
          <Select
            value={formik.values?.paymentMethod || ""}
            onValueChange={(value) => formik.setFieldValue("paymentMethod", value)}
          >
            <SelectTrigger id="payment-method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bank account picker */}
        {formik.values?.paymentMethod === "bank_transfer" && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900">Deposit To</label>
            <div className="grid gap-3">
              {bankAccounts.map((bank) => (
                <button
                  key={bank._id}
                  type="button"
                  onClick={() => {
                    setSelectedBankAccountId(bank._id);
                    formik.setFieldValue("bankAccountId", bank._id);
                  }}
                  className={`w-full text-left p-4 border-2 rounded-lg cursor-pointer transition-colors ${selectedBankAccountId === bank._id
                    ? "border-slate-900 bg-slate-900/[0.03]"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{bank.bankName}</p>
                      <p className="text-xs text-slate-500">
                        **** **** {bank.accountNumber?.slice(-4) || "****"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                        Balance
                      </p>
                      <p className="font-semibold text-slate-900 text-sm">
                        ₹{bank.balance?.toLocaleString() || "0"}
                      </p>
                    </div>
                    {selectedBankAccountId === bank._id && (
                      <div className="ml-3 text-slate-900">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Payment Date</label>
          <DualCalendarTailwind
            onChange={(english, nepali) => {
              if (english && nepali) {
                formik.setFieldValue("paymentDate", new Date(english));
                formik.setFieldValue("nepaliDate", nepali);
              } else {
                formik.setFieldValue("paymentDate", null);
                formik.setFieldValue("nepaliDate", null);
              }
            }}
          />
        </div>

        {/* Transaction Reference */}
        <div className="space-y-2">
          <label htmlFor="transaction-ref" className="text-sm font-medium text-slate-900">
            Transaction Reference{" "}
            <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <Input
            id="transaction-ref"
            placeholder="e.g., CHQ-12345 or Bank Ref ID"
            value={formik.values?.transactionRef || ""}
            onChange={(e) => formik.setFieldValue("transactionRef", e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label htmlFor="note" className="text-sm font-medium text-slate-900">
            Note{" "}
            <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <Input
            id="note"
            placeholder="e.g., Payment for Unit A and Unit B"
            value={formik.values?.note || ""}
            onChange={(e) => formik.setFieldValue("note", e.target.value)}
          />
        </div>
      </section>

      {/* ── 6️⃣ Final Summary ────────────────────────────────────────────── */}
      <section
        className={`mt-6 mb-2 rounded-xl border px-5 py-4 ${summaryTone.container}`}
      >
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Final Summary
            </p>
            <p className={`text-xs font-medium ${summaryTone.accent}`}>
              {balanceOwed < 0
                ? "Allocation exceeds total due. Reduce the amount or allocations."
                : balanceOwed === 0
                  ? "Fully allocated. This payment clears the selected dues."
                  : "Partially allocated. Remaining balance will stay outstanding."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right min-w-[260px]">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Due</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                ₹{totalDue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Allocated</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                ₹{totalAllocated.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                Remaining Balance
              </p>
              <p className={`mt-1 text-base font-semibold ${summaryTone.accent}`}>
                ₹{balanceOwed.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <DialogFooter className="mt-2 border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {(!selectedUnits.length || isOverAllocated || unitAllocationMismatch) && (
          <div className="text-xs text-rose-600">
            {!selectedUnits.length && <p>Select at least one unit before submitting.</p>}
            {isOverAllocated && (
              <p>Allocation total cannot exceed the payment amount.</p>
            )}
            {unitAllocationMismatch && (
              <p>
                Per-unit rent allocations must sum to ₹{rentAllocation.toFixed(2)}.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitDisabled}
            onClick={async (e) => {
              e.preventDefault();
              // Build the complete, correctly-shaped payload and inject into formik
              const payload = buildPayload();
              await formik.setValues({ ...formik.values, ...payload });
              await formik.handleSubmit();
              if (formik.isValid) {
                onClose();
              }
            }}
          >
            Submit Payment
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
};