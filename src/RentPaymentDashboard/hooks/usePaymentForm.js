import { useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import api from "../../../plugins/axios";
import { getPaymentAmounts, findMatchingCam } from "../utils/paymentUtil";

/**
 * Custom hook for managing payment form state and submission.
 *
 * Industry Standard: Separation of concerns — the dialog owns UI state
 * (selected units, per-unit allocations, allocation mode preview).
 * The hook owns transport state (formik values, API call, toast feedback).
 *
 * The dialog's buildPayload() assembles the complete API-shaped object and
 * injects it into formik via setValues() before calling handleSubmit().
 * Therefore onSubmit receives a fully-formed values object and just POSTs it.
 */
export const usePaymentForm = ({ rents, cams, onSuccess }) => {
  // ── UI-only state (passed to dialog for rendering) ─────────────────────
  const [allocationMode, setAllocationMode] = useState("auto"); // "auto" | "manual"
  const [rentAllocation, setRentAllocation] = useState(0);
  const [camAllocation, setCamAllocation] = useState(0);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");

  // ── Formik ──────────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: {
      // Core identifiers
      tenantId: "",
      rentId: "", // convenience ref; also lives in allocations.rent.rentId

      // Payment fields — match API contract exactly
      amount: 0, // total in rupees
      paymentDate: null,
      nepaliDate: null,
      paymentMethod: "",
      paymentStatus: "paid",
      bankAccountId: "",
      transactionRef: "",
      note: "",

      // Allocation payload — assembled by PaymentDialog.buildPayload()
      // Shape: { rent?: { rentId, amount, unitAllocations? }, cam?: { camId, paidAmount } }
      allocations: {},
    },

    onSubmit: async (values) => {
      try {
        /**
         * The dialog's buildPayload() has already injected the complete,
         * API-shaped payload into formik values via setValues().
         * We only need to normalise paymentMethod casing and POST.
         *
         * Industry Standard: thin submit handler — validate in the form,
         * transform minimally, delegate to the transport layer.
         */
        const payload = {
          tenantId: values.tenantId,
          amount: values.amount, // rupees — matches API contract
          paymentDate: values.paymentDate,
          nepaliDate: values.nepaliDate,
          paymentMethod: String(values.paymentMethod || "").toLowerCase(),
          paymentStatus: values.paymentStatus || "paid",
          note: values.note || "",
          bankAccountId: values.bankAccountId || null,
          transactionRef: values.transactionRef || null,
          allocations: values.allocations, // fully built by dialog
        };

        // Guard: allocations must have at least one entry
        if (!payload.allocations?.rent && !payload.allocations?.cam) {
          toast.error("No allocations found. Please try again.");
          return;
        }

        const response = await api.post(
          "/api/payment/pay-rent-and-cam",
          payload,
        );

        if (response.data.success) {
          toast.success(response.data.message);
          resetForm();
          onSuccess?.();
        } else {
          toast.error(response.data.message || "Payment failed.");
        }
      } catch (error) {
        console.error("Payment submission error:", error);
        const serverMsg = error?.response?.data?.message;
        toast.error(serverMsg || "Failed to submit payment. Please try again.");
      }
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Full form + UI state reset */
  const resetForm = () => {
    formik.resetForm();
    setRentAllocation(0);
    setCamAllocation(0);
    setSelectedBankAccountId("");
    setAllocationMode("auto");
  };

  /**
   * Opens payment dialog and seeds formik + allocation state.
   *
   * Note: tenantId is set here so buildPayload() in the dialog can read
   * formik.values.tenantId as a fallback if rent.tenant is unpopulated.
   */
  const handleOpenDialog = (rent) => {
    const { rentAmount, camAmount } = getPaymentAmounts(rent, cams);

    formik.setValues({
      ...formik.initialValues,
      rentId: rent._id.toString(),
      tenantId: rent.tenant?._id?.toString() || rent.tenant?.toString() || "",
      amount: rentAmount + camAmount,
      paymentMethod: formik.values.paymentMethod || "",
    });

    setAllocationMode("auto");
    setRentAllocation(rentAmount);
    setCamAllocation(camAmount);
    setSelectedBankAccountId("");
  };

  /**
   * Handles amount input change and auto-allocates rent-first, then CAM.
   *
   * Industry Standard: prioritise rent before CAM (oldest obligation first),
   * mirroring the FIFO strategy available on the backend.
   */
  const handleAmountChange = (amount, rent) => {
    formik.setFieldValue("amount", amount);

    if (allocationMode === "auto" && rent) {
      const { rentAmount, camAmount } = getPaymentAmounts(rent, cams);
      const totalDue = rentAmount + camAmount;

      if (amount >= totalDue) {
        // Full payment — clear everything
        setRentAllocation(rentAmount);
        setCamAllocation(camAmount);
      } else if (amount >= rentAmount) {
        // Full rent + partial CAM
        setRentAllocation(rentAmount);
        setCamAllocation(amount - rentAmount);
      } else {
        // Partial rent only
        setRentAllocation(amount);
        setCamAllocation(0);
      }
    }
  };

  return {
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
    resetForm,
  };
};
