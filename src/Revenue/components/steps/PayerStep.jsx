import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function PayerStep({ formik, tenants }) {
  const payerType = formik.values.payerType ?? "tenant";

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold mb-3 block">Payer Type</Label>
        <Tabs
          value={payerType}
          onValueChange={(value) => formik.setFieldValue("payerType", value)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tenant">Tenant</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {payerType === "tenant" && (
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

      {payerType === "external" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalPayerName">External payer name</Label>
            <Input
              id="externalPayerName"
              placeholder="Name of payer"
              value={formik.values.externalPayerName ?? ""}
              onChange={(e) =>
                formik.setFieldValue("externalPayerName", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formik.values.externalPayerType ?? "PERSON"}
              onValueChange={(value) =>
                formik.setFieldValue("externalPayerType", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Person or Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSON">Person</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
