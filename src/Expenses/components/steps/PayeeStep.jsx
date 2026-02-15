import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function PayeeStep({ formik, tenants }) {
  const payeeType = formik.values.payeeType ?? "tenant";

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold mb-3 block">Payee Type</Label>
        <Tabs
          value={payeeType}
          onValueChange={(value) => formik.setFieldValue("payeeType", value)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tenant">Tenant</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {payeeType === "tenant" && (
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant</Label>
          <Select
            id="tenantId"
            value={formik.values.tenantId ?? ""}
            onValueChange={(value) => formik.setFieldValue("tenantId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(tenants) &&
                tenants.map((tenant) => (
                  <SelectItem key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {payeeType === "external" && (
        <div className="space-y-2">
          <Label htmlFor="externalPayeeName">Payee name (optional)</Label>
          <Input
            id="externalPayeeName"
            placeholder="Vendor or payee name"
            value={formik.values.externalPayeeName ?? ""}
            onChange={(e) =>
              formik.setFieldValue("externalPayeeName", e.target.value)
            }
          />
        </div>
      )}
    </div>
  );
}
