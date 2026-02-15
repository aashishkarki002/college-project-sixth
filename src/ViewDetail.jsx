import { useState, useEffect } from "react";
import api from "../plugins/axios";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Key,
  File,
  Image as ImageIcon,
  Eye,
  Download,
  Printer,
  Share2,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  Wrench,
} from "lucide-react";
import { toNepaliDate } from "../utils/formatNepali";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ViewDetail() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "timeline"
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const { id } = useParams();

  const getTenant = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tenant/get-tenant/${id}`);
      setTenant(response.data.tenant);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTenant();
  }, [id]);

  // Auto-select first document when tenant data loads
  useEffect(() => {
    if (tenant?.documents?.length > 0) {
      const firstDocument = tenant.documents[0];
      if (firstDocument?.files?.length > 0) {
        setSelectedDocument(firstDocument);
        setSelectedFile(firstDocument.files[0]);
      }
    }
  }, [tenant]);

  // Calculate lease progress
  const calculateLeaseProgress = () => {
    if (!tenant?.leaseStartDate || !tenant?.leaseEndDate) {
      return { progress: 0, remainingMonths: 0 };
    }

    const startDate = new Date(tenant.leaseStartDate);
    const endDate = new Date(tenant.leaseEndDate);
    const now = new Date();

    // Calculate total lease duration in months
    const totalMonths =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    // Calculate elapsed time in months
    const elapsedMonths =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());

    // Calculate remaining months
    const remainingMonths = Math.max(0, totalMonths - elapsedMonths);

    // Calculate progress percentage (0-100)
    const progress = Math.min(
      100,
      Math.max(0, (elapsedMonths / totalMonths) * 100)
    );

    return { progress, remainingMonths };
  };
  const getMaintenanceHistory = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/maintenance/get-maintenance/${id}`);
      const list = response.data?.maintenance;
      setMaintenanceHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      setMaintenanceHistory([]);
    }
  };
  useEffect(() => {
    getMaintenanceHistory();
  }, [id]);

  // Maintenance for this tenant (fetched by tenant id from API)
  const tenantMaintenance = maintenanceHistory ?? [];

  const { progress, remainingMonths } = calculateLeaseProgress();

  const getUnitLabel = () => {
    if (!tenant?.units || tenant.units.length === 0) return "—";

    const firstUnit = tenant.units[0];

    // If units are objects with name
    if (typeof firstUnit === "object" && firstUnit !== null) {
      return tenant.units.map((unit) => unit.name).join(", ");
    }

    // If units are just ids/strings
    return tenant.units.join(", ");
  };

  return (
    <div className="px-2 sm:px-4 md:px-6">
      <Card className="border border-border shadow-sm rounded-xl bg-gray-50">
        <CardHeader className="space-y-4 p-4 sm:p-6">
          {/* Header Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="text-base sm:text-lg font-semibold">
                  {tenant?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight">
                    {tenant?.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-green-600 text-green-700 bg-green-50 text-xs"
                  >
                    {tenant?.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-yellow-600 text-yellow-700 bg-yellow-50 text-xs"
                  >
                    {tenant?.rentPaymentFrequency === "monthly"
                      ? "Monthly Rent"
                      : "Quarterly Rent"}
                  </Badge>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Tenant ID: #{tenant?._id?.slice(-8)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {tenant?.leaseStartDate && tenant?.leaseEndDate && (
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <Progress
                  value={progress}
                  className="h-2.5 mb-2 [&>div]:bg-blue-600"
                />
                <p className="text-xs text-muted-foreground">
                  {remainingMonths === 0
                    ? "Lease completed"
                    : remainingMonths === 1
                      ? "1 month remaining"
                      : `${remainingMonths} months remaining`}
                </p>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <CardDescription className="flex flex-col gap-2 text-xs sm:text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">
                {tenant?.block?.name}, {tenant?.innerBlock?.name} —{" "}
                {getUnitLabel()}
              </span>
            </div>

            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Since:</span>{" "}
              {tenant?.leaseStartDate
                ? new Date(tenant.leaseStartDate).toDateString()
                : "—"}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
      <Tabs defaultValue="personalInfo" className="mt-4 gap-2">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger
            value="personalInfo"
            className="text-xs sm:text-sm px-2 py-2"
          >
            <span className="hidden sm:inline">Overview & Lease</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="text-xs sm:text-sm px-2 py-2"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="propertyDetails"
            className="text-xs sm:text-sm px-2 py-2"
          >
            Maintenance
          </TabsTrigger>
          <TabsTrigger
            value="paymentHistory"
            className="text-xs sm:text-sm px-2 py-2"
          >
            <span className="hidden sm:inline">Payment History</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="personalInfo" className="mt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 lg:flex-2">
              <Card className="border border-border shadow-sm rounded-xl bg-gray-50">
                <CardHeader className="space-y-4 p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">
                    Personal Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Card className="w-full">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                          <CardTitle className="text-sm sm:text-base">
                            Email Address
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <span className="text-xs sm:text-sm text-gray-500 font-bold break-all">
                          {tenant?.email}
                        </span>
                      </CardContent>
                    </Card>
                    <Card className="w-full">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                          <CardTitle className="text-sm sm:text-base">
                            Contact Number
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <span className="text-xs sm:text-sm text-gray-500 font-bold">
                          {tenant?.phone}
                        </span>
                      </CardContent>
                    </Card>
                    <Card className="w-full">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                          <CardTitle className="text-sm sm:text-base">
                            Permanent Address
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <span className="text-xs sm:text-sm text-gray-500 font-bold break-words">
                          {tenant?.address}
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4">
                    <Card className="w-full">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          <CardTitle className="text-sm sm:text-base">
                            Lease Terms
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <div className="rounded-xl border bg-background p-3 sm:p-4">
                          {/* Dates Section */}
                          <div className="flex flex-col sm:flex-row gap-4 rounded-lg border p-3 sm:p-4">
                            {/* Lease Start */}
                            <div className="flex-1">
                              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                                Lease Start Date
                              </p>

                              <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                                <span className="text-muted-foreground">
                                  AD
                                </span>
                                <span className="font-medium break-words text-right">
                                  {tenant?.leaseStartDate
                                    ? new Date(
                                      tenant.leaseStartDate
                                    ).toDateString()
                                    : "—"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-muted-foreground">
                                  BS
                                </span>
                                <span className="font-medium break-words text-right">
                                  {tenant?.leaseStartDate
                                    ? toNepaliDate(tenant.leaseStartDate)
                                    : "—"}
                                </span>
                              </div>
                            </div>

                            {/* Vertical Separator - Hidden on mobile */}
                            <Separator
                              orientation="vertical"
                              className="hidden sm:block"
                            />
                            <Separator className="sm:hidden" />

                            {/* Lease End */}
                            <div className="flex-1">
                              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                                Lease End Date
                              </p>

                              <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                                <span className="text-muted-foreground">
                                  AD
                                </span>
                                <span className="font-medium break-words text-right">
                                  {tenant?.leaseEndDate
                                    ? new Date(
                                      tenant.leaseEndDate
                                    ).toDateString()
                                    : "—"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-muted-foreground">
                                  BS
                                </span>
                                <span className="font-medium break-words text-right">
                                  {tenant?.leaseEndDate
                                    ? toNepaliDate(tenant.leaseEndDate)
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Key Handover */}
                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border px-3 sm:px-4 py-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-muted">
                                <Key className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                              </div>
                              <span className="text-xs sm:text-sm">
                                Key Handover Status
                              </span>
                            </div>

                            <span className="text-xs sm:text-sm font-medium">
                              {tenant?.keyHandoverDate
                                ? new Date(
                                  tenant.keyHandoverDate
                                ).toDateString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1 lg:flex-1">
              <Card className="rounded-xl border border-border bg-gray-50 shadow-sm">
                <CardHeader className="space-y-2 p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">
                    Financial Snapshot
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Overview of the tenant&apos;s financials
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                  {/* Lease Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-xs sm:text-sm font-medium">
                        Lease Area
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {tenant?.leasedSquareFeet} <span>sqft</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Rate Per Sqft
                      </p>
                      <p className="text-xs sm:text-sm font-medium">
                        {tenant?.pricePerSqftFormatted ??
                          (tenant?.pricePerSqft != null
                            ? `₹${tenant.pricePerSqft.toLocaleString()}`
                            : "—")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Security Deposit */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium">
                      Security Deposit
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {tenant?.securityDepositFormatted ??
                        (tenant?.securityDeposit != null
                          ? `₹${tenant.securityDeposit.toLocaleString()}`
                          : "—")}
                    </p>
                  </div>

                  {/* TDS */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium">
                      TDS ({tenant?.tdsPercentage ?? 10}%)
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {tenant?.tdsFormatted ??
                        (tenant?.tds != null
                          ? `₹${tenant.tds.toLocaleString()}`
                          : "—")}
                    </p>
                  </div>

                  <Separator />

                  {/* net Amount */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-semibold">
                      Net Amount including CAM
                    </p>
                    <p className="text-xs sm:text-sm font-semibold">
                      {tenant?.netAmountFormatted ??
                        (tenant?.netAmount != null
                          ? `₹${tenant.netAmount.toLocaleString()}`
                          : "—")}
                    </p>
                  </div>
                  {tenant?.rentPaymentFrequency === "quarterly" && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-semibold">
                        Quarterly Rent Amount
                      </p>
                      <p className="text-xs sm:text-sm font-semibold">
                        {tenant?.quarterlyRentAmountFormatted ??
                          (tenant?.quarterlyRentAmount != null
                            ? `₹${tenant.quarterlyRentAmount.toLocaleString()}`
                            : "—")}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-semibold">
                      Gross Amount excluding CAM
                    </p>
                    <p className="text-xs sm:text-sm font-semibold">
                      {tenant?.grossAmountFormatted ??
                        (tenant?.grossAmount != null
                          ? `₹${tenant.grossAmount.toLocaleString()}`
                          : "—")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <Card className="border border-border shadow-sm rounded-xl bg-gray-50">
            <CardHeader className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  <CardTitle className="text-lg sm:text-xl">
                    Documents & Verification
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setViewMode("timeline")}
                    className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${viewMode === "timeline"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                  >
                    Timeline
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row h-[400px] sm:h-[500px] md:h-[600px] border-t">
                {/* Left Panel - Document List */}
                <div className="w-full md:w-1/3 border-r border-b md:border-b-0 bg-background overflow-y-auto">
                  <div className="p-4 space-y-2">
                    {tenant?.documents?.length > 0 ? (
                      tenant.documents.map((document) =>
                        document.files?.map((file, fileIndex) => {
                          const isSelected = selectedFile?._id === file._id;
                          const fileType = file.url
                            .split(".")
                            .pop()
                            .toLowerCase();
                          const isPdf = fileType === "pdf";
                          const isImage = [
                            "jpg",
                            "jpeg",
                            "png",
                            "gif",
                            "webp",
                          ].includes(fileType);
                          const documentTypeLabel =
                            document.type === "citizenShip"
                              ? "Citizenship"
                              : document.type === "pdfAgreement"
                                ? "Lease Agreement"
                                : document.type === "image"
                                  ? "Property Photos"
                                  : document.type === "bank_guarantee"
                                    ? "Bank Guarantee"
                                    : document.type;

                          // Generate file name from URL or use type
                          const urlParts = file.url.split("/");
                          const urlFileName =
                            urlParts[urlParts.length - 1].split("?")[0];
                          const fileName =
                            urlFileName && urlFileName.length > 5
                              ? urlFileName
                              : `${documentTypeLabel.replace(/\s+/g, "_")}_${fileIndex + 1
                              }.${fileType}`;

                          return (
                            <div
                              key={file._id}
                              onClick={() => {
                                setSelectedDocument(document);
                                setSelectedFile(file);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent ${isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border bg-background"
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {isPdf ? (
                                    <FileText className="w-5 h-5 text-red-600" />
                                  ) : isImage ? (
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <File className="w-5 h-5 text-gray-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Uploaded:{" "}
                                    {new Date(
                                      file.uploadedAt
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {documentTypeLabel}
                                  </p>
                                </div>
                                <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No documents available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel - Document Preview */}
                <div className="flex-1 bg-background flex flex-col min-h-[300px] md:min-h-0">
                  {selectedFile ? (
                    <>
                      {/* Preview Header */}
                      <div className="border-b p-2 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wide truncate">
                            Preview{" "}
                            {(() => {
                              const urlParts = selectedFile.url.split("/");
                              const fileName =
                                urlParts[urlParts.length - 1].split("?")[0];
                              return fileName.length > 20
                                ? fileName.substring(0, 20) + "..."
                                : fileName;
                            })().toUpperCase()}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-background rounded border">
                            <ZoomOut className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs font-medium">100%</span>
                            <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                          <button
                            className="p-1.5 sm:p-2 hover:bg-accent rounded-md transition-colors"
                            title="Print"
                          >
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            className="p-1.5 sm:p-2 hover:bg-accent rounded-md transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <a
                            href={selectedFile.url}
                            download
                            className="p-1.5 sm:p-2 hover:bg-accent rounded-md transition-colors"
                            title="Download"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </a>
                        </div>
                      </div>

                      {/* Preview Content */}
                      <div className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-4 md:p-8 flex items-center justify-center">
                        {selectedFile.url.split(".").pop().toLowerCase() ===
                          "pdf" ? (
                          <iframe
                            src={selectedFile.url}
                            className="w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] border border-border rounded-lg shadow-lg bg-white"
                            title="PDF Preview"
                          />
                        ) : (
                          <div className="max-w-4xl w-full">
                            <img
                              src={selectedFile.url}
                              alt="Document preview"
                              className="w-full h-auto rounded-lg border border-border shadow-lg bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                      <div className="text-center">
                        <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-base sm:text-lg font-medium">
                          Select a document to preview
                        </p>
                        <p className="text-xs sm:text-sm mt-2">
                          Click on any document from the list to view it here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="propertyDetails" className="mt-4">
          <Card className="border border-border shadow-sm rounded-xl bg-gray-50">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg sm:text-xl">Maintenance</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Maintenance tasks and requests for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {tenantMaintenance?.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold">Title</TableHead>
                        <TableHead className="text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Priority</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Scheduled</TableHead>
                        <TableHead className="text-xs font-semibold">Amount</TableHead>
                        <TableHead className="text-xs font-semibold">Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantMaintenance.map((task) => (
                        <TableRow key={task._id} className="text-xs sm:text-sm">
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-muted-foreground truncate max-w-[180px]" title={task.description}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{task.type ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                task.priority === "Urgent"
                                  ? "border-red-600 text-red-700 bg-red-50"
                                  : task.priority === "High"
                                    ? "border-orange-600 text-orange-700 bg-orange-50"
                                    : task.priority === "Medium"
                                      ? "border-amber-600 text-amber-700 bg-amber-50"
                                      : "border-gray-500 text-gray-600 bg-gray-50"
                              }
                            >
                              {task.priority ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                task.status === "COMPLETED"
                                  ? "border-green-600 text-green-700 bg-green-50"
                                  : task.status === "IN_PROGRESS"
                                    ? "border-blue-600 text-blue-700 bg-blue-50"
                                    : task.status === "CANCELLED"
                                      ? "border-gray-500 text-gray-600 bg-gray-50"
                                      : "border-amber-600 text-amber-700 bg-amber-50"
                              }
                            >
                              {task.status?.replace("_", " ") ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.scheduledDate
                              ? new Date(task.scheduledDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {task.amount != null
                              ? `₹${Number(task.amount).toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">
                              {task.paymentStatus?.replace("_", " ") ?? "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wrench className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No maintenance records</p>
                  <p className="text-xs mt-1">
                    Tasks for this tenant or their unit/property will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="paymentHistory">
          <PaymentHistoryTab tenantId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Payment History Tab Component
function PaymentHistoryTab({ tenantId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 0,
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPaymentHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const limit = pagination.limit || 10;
      const response = await api.get(
        `/api/payment/get-payment-history-by-tenant/${tenantId}?page=${page}&limit=${limit}`
      );
      if (response.data.success) {
        setPayments(response.data.data || []);
        setPagination((prev) => ({
          ...prev,
          ...response.data.pagination,
        }));
      } else {
        setError(response.data.message || "Failed to fetch payment history");
      }
    } catch (err) {
      console.error("Error fetching payment history:", err);
      setError(
        err.response?.data?.message || "Failed to fetch payment history"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchPaymentHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const formatPaymentDate = (date) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "N/A";
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "N/A";
    const methodMap = {
      bank_transfer: "Bank Deposit",
      cheque: "Cheque",
      cash: "Cash",
      esewa: "eSewa Transfer",
    };
    return (
      methodMap[method] ||
      method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "paid") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          PAID
        </Badge>
      );
    } else if (statusLower === "pending" || statusLower === "upcoming") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          UPCOMING
        </Badge>
      );
    } else if (statusLower === "overdue") {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          OVERDUE
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          {status?.toUpperCase() || "N/A"}
        </Badge>
      );
    }
  };

  const handleDownloadLedger = () => {
    // Create CSV content
    const headers = ["Date", "Amount (रु)", "Method", "Status"];
    const rows = payments.map((payment) => [
      formatPaymentDate(payment.paymentDate),
      payment.amount?.toLocaleString() || "0",
      formatPaymentMethod(payment.paymentMethod),
      payment.paymentStatus?.toUpperCase() || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payment-ledger-${tenantId}-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border border-border shadow-sm rounded-xl bg-gray-50">
      <CardHeader className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <CardTitle className="text-lg sm:text-xl">
              Payment History Ledger
            </CardTitle>
          </div>
          <button
            onClick={handleDownloadLedger}
            className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm sm:text-base px-3 py-2 rounded-md hover:bg-blue-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Ledger</span>
            <span className="sm:hidden">Download</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm sm:text-base text-muted-foreground">
              Loading payment history...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm sm:text-base text-red-600">{error}</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-3">
                  {payments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No payment history found
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <Card key={payment._id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Date
                            </span>
                            <span className="text-sm font-medium">
                              {formatPaymentDate(payment.paymentDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Amount (रु)
                            </span>
                            <span className="text-sm font-semibold">
                              {payment.amount?.toLocaleString() || "0"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Method
                            </span>
                            <span className="text-sm">
                              {formatPaymentMethod(payment.paymentMethod)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Status
                            </span>
                            {getStatusBadge(payment.paymentStatus)}
                          </div>
                          {payment.receipt?.url && (
                            <div className="pt-2 border-t">
                              <button
                                onClick={() =>
                                  setSelectedReceipt(payment.receipt.url)
                                }
                                className="w-full text-center text-blue-600 hover:text-blue-800 transition-colors text-sm py-1"
                              >
                                View Receipt
                              </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">DATE</TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        AMOUNT (रु)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        METHOD
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        STATUS
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No payment history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {formatPaymentDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {payment.amount?.toLocaleString() || "0"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {formatPaymentMethod(payment.paymentMethod)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.paymentStatus)}
                          </TableCell>
                          <TableCell>
                            {payment.receipt?.url ? (
                              <button
                                onClick={() =>
                                  setSelectedReceipt(payment.receipt.url)
                                }
                                className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm"
                              >
                                View Receipt
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">
                                N/A
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.totalRecords
                  )}{" "}
                  of {pagination.totalRecords} payments
                </div>
                <div className="flex gap-2 justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPaymentHistory(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="text-xs sm:text-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPaymentHistory(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.totalPages || loading
                    }
                    className="text-xs sm:text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Receipt Dialog */}
      {selectedReceipt && (
        <Dialog
          open={!!selectedReceipt}
          onOpenChange={(open) => !open && setSelectedReceipt(null)}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-2 sm:p-6">
            <DialogHeader className="p-2 sm:p-0">
              <DialogTitle className="text-base sm:text-lg">
                Payment Receipt
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2 sm:p-0">
              <iframe
                src={selectedReceipt}
                className="w-full h-[400px] sm:h-[500px] md:h-[600px] border rounded-lg"
                title="Payment Receipt"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

export default ViewDetail;
