import { useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import api from "../../../../plugins/axios";
import { validateTenantForm } from "../utils/tenantValidation";
import { buildTenantFormData } from "../utils/formDataBuilder";
import { getPropertyIdFromBlock } from "../utils/propertyHelper";

const INITIAL_VALUES = {
  name: "",
  unitNumber: [],
  phone: "",
  email: "",
  address: "",
  leaseStartDate: "",
  leaseEndDate: "",
  block: "",
  innerBlock: "",
  documentType: "",
  documents: {},
  dateOfAgreementSigned: "",
  leasedSquareFeet: "",
  pricePerSqft: "",
  camRatePerSqft: "",
  securityDeposit: "",
  status: "",
  keyHandoverDate: "",
  spaceHandoverDate: "",
  spaceReturnedDate: "",
  paymentMethod: "",
  bankGuaranteePhoto: null,
  chequeAmount: "",
  chequeNumber: "",
  unitFinancials: {},
  tdsPercentage: "0",
  rentPaymentFrequency: "",
};

export const useTenantForm = (property, onSuccess) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { resetForm }) => {
    try {
      setIsLoading(true);

      // Validate form
      const validationErrors = validateTenantForm(values);
      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => toast.error(error));
        return;
      }

      // Get property ID
      const propertyId = getPropertyIdFromBlock(values.block, property);
      if (!propertyId) {
        toast.error("Please select a valid block");
        return;
      }

      // Build form data
      const formData = buildTenantFormData(values, propertyId);
      console.log("formData", values);

      // Submit
      const response = await api.post("/api/tenant/create-tenant", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Tenant registered successfully!");
      resetForm();

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast.error(error.response?.data?.message || "Failed to register tenant");
    } finally {
      setIsLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: INITIAL_VALUES,
    onSubmit: handleSubmit,
  });

  return {
    formik,
    isLoading,
  };
};
