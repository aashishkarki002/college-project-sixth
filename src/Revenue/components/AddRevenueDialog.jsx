import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RevenueStepper } from "./RevenueStepper";
import { PayerStep } from "./steps/PayerStep";
import { RevenueInfoStep } from "./steps/RevenueInfoStep";
import { PaymentStep } from "./steps/PaymentStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useFormik } from "formik";
import api from "../../../plugins/axios";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const TOTAL_STEPS = 4;

const initialValues = {
  payerType: "tenant",
  tenantId: "",
  externalPayerName: "",
  externalPayerType: "PERSON",
  referenceType: "",
  referenceId: "",
  amount: "",
  date: "",
  notes: "",
  bankAccount: "",
  paymentSchedule: "one_time",
};

export function AddRevenueDialog({
  open,
  onOpenChange,
  tenants,
  revenueSource,
  bankAccounts,
  onSuccess,
}) {
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  const formik = useFormik({
    initialValues,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const payerType = values.payerType === "tenant" ? "TENANT" : "EXTERNAL";
        const payload = {
          source: values.referenceType,
          amount: Number(values.amount),
          date: values.date || new Date().toISOString().split("T")[0],
          payerType,
          referenceType: "MANUAL",
          referenceId: values.referenceId || undefined,
          notes: values.notes || undefined,
          bankAccountId: values.bankAccount,
          paymentMethod: "bank_transfer",
          createdBy: undefined,
        };

        if (payerType === "TENANT") {
          payload.tenant = values.tenantId;
        } else {
          payload.externalPayer = {
            name: values.externalPayerName,
            type: values.externalPayerType,
          };
        }

        const response = await api.post("/api/revenue/create", payload);
        if (response.data?.success) {
          onSuccess?.(response.data);
          handleClose();
        } else {
          console.error(response.data?.message || "Create failed");
        }
      } catch (err) {
        console.error("Error creating revenue:", err);
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
          <DialogTitle>Add New Revenue Stream</DialogTitle>
        </DialogHeader>

        <RevenueStepper
          currentStep={step}
          onStepClick={handleStepClick}
          allowClick={true}
        />

        <div className="min-h-[200px]">
          {step === 1 && (
            <PayerStep formik={formik} tenants={tenants} />
          )}
          {step === 2 && (
            <RevenueInfoStep formik={formik} revenueSource={revenueSource} />
          )}
          {step === 3 && (
            <PaymentStep formik={formik} bankAccounts={bankAccounts} />
          )}
          {step === 4 && (
            <ReviewStep
              formik={formik}
              tenants={tenants}
              bankAccounts={bankAccounts}
              revenueSource={revenueSource}
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
