import { Label } from "@/components/ui/label";
import { calculateRentBreakdown } from "../utils/financialCalculation";

export const FinancialTotalsDisplay = ({ unitFinancials }) => {
    if (!unitFinancials || Object.keys(unitFinancials).length === 0) {
        return null;
    }

    const totals = calculateRentBreakdown(unitFinancials);

    return (
        <div className="space-y-3 border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Calculated Totals</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-sm text-muted-foreground">
                        Total Square Feet:
                    </Label>
                    <p className="text-lg font-medium">
                        {totals.totalSqft.toFixed(2)} sqft
                    </p>
                </div>
                <div>
                    <Label className="text-sm text-muted-foreground">
                        Gross Monthly Rent:
                    </Label>
                    <p className="text-lg font-medium">
                        ₹{totals.grossMonthlyRent.toFixed(2)}
                    </p>
                </div>
                <div>
                    <Label className="text-sm text-muted-foreground">
                        Monthly CAM:
                    </Label>
                    <p className="text-lg font-medium">
                        ₹{totals.monthlyCAM.toFixed(2)}
                    </p>
                </div>
                <div>
                    <Label className="text-sm text-muted-foreground">
                        Total Security Deposit:
                    </Label>
                    <p className="text-lg font-medium">
                        ₹{totals.totalSecurityDeposit.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
};