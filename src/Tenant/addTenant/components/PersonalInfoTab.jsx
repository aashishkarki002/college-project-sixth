import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TENANT_STATUS } from "../constants/tenant.constant";
import { getAllBlocks } from "../utils/propertyHelper";

export const PersonalInfoTab = ({ formik, property, onNext }) => {
    const allBlocks = getAllBlocks(property);

    return (
        <Card className="shadow-sm">
            <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="name">Tenant Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Enter tenant name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formik.values.phone}
                        onChange={formik.handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        name="address"
                        placeholder="Enter address"
                        value={formik.values.address}
                        onChange={formik.handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Building *</Label>
                    <Select
                        name="block"
                        value={formik.values.block}
                        onValueChange={(value) => {
                            formik.setFieldValue("block", value);
                            formik.setFieldValue("innerBlock", "");
                            formik.setFieldValue("unitNumber", []);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Building" />
                        </SelectTrigger>
                        <SelectContent>
                            {allBlocks.map((block) => (
                                <SelectItem key={block._id} value={block._id}>
                                    {block.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                        name="status"
                        value={formik.values.status}
                        onValueChange={(value) => formik.setFieldValue("status", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TENANT_STATUS.ACTIVE}>Active</SelectItem>
                            <SelectItem value={TENANT_STATUS.INACTIVE}>Inactive</SelectItem>
                            <SelectItem value={TENANT_STATUS.PENDING}>Pending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-end mt-6">
                    <Button type="button" onClick={onNext}>
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};