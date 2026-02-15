import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardListIcon } from "lucide-react";
import { TAB_KEYS } from "./constants/tenant.constant";
import { useTenantForm } from "./hooks/useTenantForm";
import useUnits from "../../hooks/use-units";
import useProperty from "../../hooks/use-property";
import { PersonalInfoTab } from "./components/PersonalInfoTab";
import { LeaseDetailsTab } from "./components/LeaseDetailsTab";
import { FinancialTab } from "./components/FinancialTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { FinancialTotalsDisplay } from "./components/FinancialTotalsDisplay";

function AddTenants() {
  const { units } = useUnits();
  const { property } = useProperty();
  const [activeTab, setActiveTab] = useState(TAB_KEYS.PERSONAL_INFO);

  const handleSuccess = (data) => {
    // Handle success - navigate away, reset form, etc.
    console.log("Tenant created:", data);
  };

  const { formik, isLoading } = useTenantForm(property, handleSuccess);

  const handleNext = () => {
    const tabs = Object.values(TAB_KEYS);
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const tabs = Object.values(TAB_KEYS);
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const handleClose = () => {
    formik.resetForm();
    // Add navigation logic here
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardListIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Add New Tenant</h1>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value={TAB_KEYS.PERSONAL_INFO}>
                Personal Info
              </TabsTrigger>
              <TabsTrigger value={TAB_KEYS.LEASE_DETAILS}>
                Lease Details
              </TabsTrigger>
              <TabsTrigger value={TAB_KEYS.FINANCIAL}>Financial</TabsTrigger>
              <TabsTrigger value={TAB_KEYS.DOCUMENTS}>Documents</TabsTrigger>
            </TabsList>

            <TabsContent value={TAB_KEYS.PERSONAL_INFO} className="mt-4">
              <PersonalInfoTab
                formik={formik}
                property={property}
                onNext={handleNext}
              />
            </TabsContent>

            <TabsContent value={TAB_KEYS.LEASE_DETAILS} className="mt-4">
              <LeaseDetailsTab
                formik={formik}
                property={property}
                units={units}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            </TabsContent>

            <TabsContent value={TAB_KEYS.FINANCIAL} className="mt-4">
              <FinancialTab
                formik={formik}
                units={units}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />

            </TabsContent>

            <TabsContent value={TAB_KEYS.DOCUMENTS} className="mt-4">
              <DocumentsTab
                formik={formik}
                isLoading={isLoading}
                onPrevious={handlePrevious}
                onClose={handleClose}
              />
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  );
}

export default AddTenants;