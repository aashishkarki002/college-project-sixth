import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PAYMENT_METHODS } from "../constants/tenant.constant";
import { FinancialTotalsDisplay } from "./FinancialTotalsDisplay";

export const FinancialTab = ({ formik, units, onNext, onPrevious }) => {
    const selectedUnits = formik.values.unitNumber
        ?.map((unitId) => units.find((u) => u._id === unitId))
        .filter(Boolean);

    const handleFinancialChange = (unitId, field, value) => {
        formik.setFieldValue("unitFinancials", {
            ...formik.values.unitFinancials,
            [unitId]: {
                ...formik.values.unitFinancials?.[unitId],
                [field]: value,
            },
        });
    };

    const isBankGuarantee = formik.values.paymentMethod === PAYMENT_METHODS.BANK_GUARANTEE;

    return (
        <Card className="shadow-sm">
            <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label>Payment Method *</Label>
                    <Select
                        name="paymentMethod"
                        value={formik.values.paymentMethod}
                        onValueChange={(value) =>
                            formik.setFieldValue("paymentMethod", value)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={PAYMENT_METHODS.BANK_GUARANTEE}>
                                Bank Guarantee
                            </SelectItem>
                            <SelectItem value={PAYMENT_METHODS.CHEQUE}>Cheque</SelectItem>
                            <SelectItem value={PAYMENT_METHODS.CASH}>Cash</SelectItem>
                            <SelectItem value={PAYMENT_METHODS.BANK_TRANSFER}>
                                Bank Transfer
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {formik.values.paymentMethod === PAYMENT_METHODS.BANK_GUARANTEE && (
                    <div className="space-y-2">
                        <Label>Bank Guarantee Photo *</Label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                formik.setFieldValue("bankGuaranteePhoto", e.target.files?.[0])
                            }
                        />
                        {formik.values.bankGuaranteePhoto && (
                            <p className="text-sm text-gray-600">
                                Selected: {formik.values.bankGuaranteePhoto.name}
                            </p>
                        )}
                    </div>
                )}

                {formik.values.paymentMethod === PAYMENT_METHODS.CHEQUE && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cheque Amount *</Label>
                            <Input
                                name="chequeAmount"
                                type="number"
                                placeholder="Enter amount"
                                value={formik.values.chequeAmount}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cheque Number *</Label>
                            <Input
                                name="chequeNumber"
                                placeholder="Enter cheque number"
                                value={formik.values.chequeNumber}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>TDS Percentage</Label>
                    <Input
                        name="tdsPercentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Enter TDS %"
                        value={formik.values.tdsPercentage}
                        onChange={formik.handleChange}
                    />
                </div>

                {selectedUnits && selectedUnits.length > 0 && (
                    <>
                        <div className="space-y-3">
                            <h3 className="font-semibold">Unit Financial Details</h3>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Unit</TableHead>
                                            <TableHead>Sqft *</TableHead>
                                            <TableHead>Price/Sqft *</TableHead>
                                            <TableHead>CAM/Sqft *</TableHead>
                                            {!isBankGuarantee && (
                                                <TableHead>Security Deposit *</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedUnits.map((unit) => {
                                            const unitFinancial =
                                                formik.values.unitFinancials?.[unit._id] || {};
                                            return (
                                                <TableRow key={unit._id}>
                                                    <TableCell className="font-medium">
                                                        {unit.unitNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Sqft"
                                                            value={unitFinancial.sqft || ""}
                                                            onChange={(e) =>
                                                                handleFinancialChange(
                                                                    unit._id,
                                                                    "sqft",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Price"
                                                            value={unitFinancial.pricePerSqft || ""}
                                                            onChange={(e) =>
                                                                handleFinancialChange(
                                                                    unit._id,
                                                                    "pricePerSqft",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="CAM"
                                                            value={unitFinancial.camPerSqft || ""}
                                                            onChange={(e) =>
                                                                handleFinancialChange(
                                                                    unit._id,
                                                                    "camPerSqft",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    {!isBankGuarantee && (
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="Deposit"
                                                                value={unitFinancial.securityDeposit || ""}
                                                                onChange={(e) =>
                                                                    handleFinancialChange(
                                                                        unit._id,
                                                                        "securityDeposit",
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <FinancialTotalsDisplay unitFinancials={formik.values.unitFinancials} />
                    </>
                )}

                <div className="flex justify-between mt-6">
                    <Button type="button" variant="outline" onClick={onPrevious}>
                        Previous
                    </Button>
                    <Button type="button" onClick={onNext}>
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};