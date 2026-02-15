import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Payee", short: "Payee" },
  { id: 2, title: "Expense Info", short: "Expense" },
  { id: 3, title: "Payment", short: "Payment" },
  { id: 4, title: "Review", short: "Review" },
];

export function ExpenseStepper({ currentStep, onStepClick, allowClick }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;
          const canClick = allowClick && (isComplete || isCurrent);

          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-1 flex-col items-center",
                index < STEPS.length - 1 && "relative"
              )}
            >
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    "absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                    isComplete ? "bg-primary" : "bg-muted"
                  )}
                  style={{ width: "calc(100% - 2rem)", marginLeft: "1rem" }}
                  aria-hidden
                />
              )}

              <button
                type="button"
                onClick={() => canClick && onStepClick(stepNumber)}
                disabled={!canClick}
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isComplete &&
                  "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                  "border-primary bg-background text-primary ring-2 ring-primary ring-offset-2",
                  !isComplete &&
                  !isCurrent &&
                  "border-muted-foreground/30 bg-background text-muted-foreground",
                  canClick && "cursor-pointer hover:opacity-90",
                  !canClick && "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </button>
              <span
                className={cn(
                  "mt-2 text-xs font-medium sm:text-sm",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
