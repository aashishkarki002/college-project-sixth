import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseStepper } from "./ExpenseStepper";
import { PayeeStep } from "./steps/PayeeStep";
import { ExpenseInfoStep } from "./steps/ExpenseInfoStep";
import { PaymentStep } from "./steps/PaymentStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useFormik } from "formik";
import api from "../../../plugins/axios";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const TOTAL_STEPS = 4;

const initialValues = {
  payeeType: "tenant",
  tenantId: "",
  externalPayeeName: "",
  source: "",
  referenceType: "MANUAL",
  referenceId: "",
  amount: "",
  date: "",
  nepaliDateStr: "",
  notes: "",
};

function parseNepaliDate(nepaliStr) {
  if (!nepaliStr || typeof nepaliStr !== "string") return null;
  const parts = nepaliStr.trim().split("-").map(Number);
  if (parts.length < 3) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  tenants,
  expenseSources,
  onSuccess,
}) {
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  const formik = useFormik({
    initialValues,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const payeeType = values.payeeType === "tenant" ? "TENANT" : "EXTERNAL";
        const nepali = parseNepaliDate(values.nepaliDateStr);
        const englishDate = values.date || new Date().toISOString().split("T")[0];

        const payload = {
          source: values.source,
          amount: Number(values.amount),
          EnglishDate: englishDate,
          referenceType: values.referenceType || "MANUAL",
          referenceId: values.referenceId || undefined,
          notes: values.notes || undefined,
          payeeType,
        };

        if (nepali) {
          payload.nepaliDate = values.nepaliDateStr;
          payload.nepaliMonth = nepali.month;
          payload.nepaliYear = nepali.year;
        } else {
          const today = new Date();
          payload.nepaliYear = 2081;
          payload.nepaliMonth = today.getMonth() + 1;
          payload.nepaliDate = `${payload.nepaliYear}-${String(payload.nepaliMonth).padStart(2, "0")}-15`;
        }

        if (payeeType === "TENANT") {
          payload.tenant = values.tenantId;
        }

        const response = await api.post("/api/expense/create", payload);
        if (response.data?.expense != null) {
          onSuccess?.(response.data);
          handleClose();
        } else {
          console.error(response.data?.message || "Create failed");
        }
      } catch (err) {
        console.error("Error creating expense:", err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    setStep(1);
    formik.resetForm({ values: initialValues });
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    setStep(1);
    formik.resetForm({ values: initialValues });
  }, [open]);

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };
  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleStepClick = (stepNumber) => {
    setStep(stepNumber);
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <ExpenseStepper
          currentStep={step}
          onStepClick={handleStepClick}
          allowClick={true}
        />

        <div className="min-h-[200px]">
          {step === 1 && (
            <PayeeStep formik={formik} tenants={tenants} />
          )}
          {step === 2 && (
            <ExpenseInfoStep formik={formik} expenseSources={expenseSources} />
          )}
          {step === 3 && <PaymentStep formik={formik} />}
          {step === 4 && (
            <ReviewStep
              formik={formik}
              tenants={tenants}
              expenseSources={expenseSources}
            />
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <div>
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isLastStep ? (
              <Button type="button" onClick={goNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => formik.handleSubmit()}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Confirm & Submit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
