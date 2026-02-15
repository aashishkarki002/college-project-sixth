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
    Combobox,
    ComboboxContent,
    ComboboxItem,
    ComboboxList,
    ComboboxChips,
    ComboboxChip,
    ComboboxChipsInput,
    ComboboxEmpty,
    ComboboxValue,
    useComboboxAnchor,
} from "@/components/ui/combobox.jsx";
import DualCalendarTailwind from "../../../components/dualDate";
import {
    getInnerBlocksForBlock,
    getUnitsForInnerBlocks,
} from "../utils/propertyHelper";
import { RENT_PAYMENT_FREQUENCY } from "../constants/tenant.constant";

export const LeaseDetailsTab = ({
    formik,
    property,
    units,
    onNext,
    onPrevious,
}) => {
    const innerBlocks = getInnerBlocksForBlock(formik.values.block, property);

    const availableUnits = formik.values.innerBlock
        ? getUnitsForInnerBlocks([formik.values.innerBlock], units)
        : [];

    const anchor = useComboboxAnchor();

    return (
        <Card className="shadow-sm">
            <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label>Inner Block</Label>
                    <Select
                        name="innerBlock"
                        value={formik.values.innerBlock}
                        onValueChange={(value) => {
                            formik.setFieldValue("innerBlock", value);
                            formik.setFieldValue("unitNumber", []);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Inner Block" />
                        </SelectTrigger>
                        <SelectContent>
                            {innerBlocks.map((innerBlock) => (
                                <SelectItem key={innerBlock._id} value={innerBlock._id}>
                                    {innerBlock.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Units *</Label>
                    <Combobox
                        multiple
                        autoHighlight
                        items={availableUnits.map((u) => String(u._id))}
                        value={formik.values.unitNumber || []}
                        onValueChange={(value) => formik.setFieldValue("unitNumber", value)}
                    >
                        <ComboboxChips ref={anchor} className="w-full">
                            <ComboboxValue>
                                {(values) => (
                                    <>
                                        {values.map((unitId) => {
                                            const unit = availableUnits.find(
                                                (u) => String(u._id) === String(unitId)
                                            );
                                            if (!unit) return null;

                                            return (
                                                <ComboboxChip key={unitId} value={unitId}>
                                                    {unit.name}
                                                </ComboboxChip>
                                            );
                                        })}
                                        <ComboboxChipsInput />
                                    </>
                                )}
                            </ComboboxValue>
                        </ComboboxChips>

                        <ComboboxContent anchor={anchor}>
                            <ComboboxEmpty>No units found.</ComboboxEmpty>
                            <ComboboxList>
                                {(id) => {
                                    const unit = availableUnits.find(
                                        (u) => String(u._id) === String(id)
                                    );
                                    if (!unit) return null;

                                    return (
                                        <ComboboxItem key={id} value={id}>
                                            {unit.name}
                                        </ComboboxItem>
                                    );
                                }}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>

                    <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Selected units:</span>{" "}
                        {(formik.values.unitNumber || [])
                            .map((unitId) => {
                                const unit = availableUnits.find(
                                    (u) => String(u._id) === String(unitId)
                                );
                                return unit ? unit.name : unitId;
                            })
                            .join(", ") || "None"}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Lease Start Date *</Label>
                        <DualCalendarTailwind
                            onChange={(englishDate) =>
                                formik.setFieldValue("leaseStartDate", englishDate)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Lease End Date *</Label>
                        <DualCalendarTailwind
                            onChange={(englishDate) =>
                                formik.setFieldValue("leaseEndDate", englishDate)
                            }
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Key Handover Date</Label>
                        <DualCalendarTailwind
                            onChange={(englishDate) =>
                                formik.setFieldValue("keyHandoverDate", englishDate)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Space Handover Date</Label>
                        <DualCalendarTailwind
                            onChange={(englishDate) =>
                                formik.setFieldValue("spaceHandoverDate", englishDate)
                            }
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Space Returned Date</Label>
                    <DualCalendarTailwind
                        onChange={(englishDate) =>
                            formik.setFieldValue("spaceReturnedDate", englishDate)
                        }
                    />
                </div>

                <div className="space-y-2">
                    <Label>Rent Payment Frequency</Label>
                    <Select
                        name="rentPaymentFrequency"
                        value={formik.values.rentPaymentFrequency}
                        onValueChange={(value) =>
                            formik.setFieldValue("rentPaymentFrequency", value)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={RENT_PAYMENT_FREQUENCY.MONTHLY}>
                                Monthly
                            </SelectItem>
                            <SelectItem value={RENT_PAYMENT_FREQUENCY.QUARTERLY}>
                                Quarterly
                            </SelectItem>
                            <SelectItem value={RENT_PAYMENT_FREQUENCY.YEARLY}>
                                Yearly
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

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