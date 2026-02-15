import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../plugins/axios";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import {
  Building2Icon,
  LightbulbIcon,
  Zap,
  Download,
  Link2,
  Mail,
  Eye,
  Share2,
  Check,
  FileText,
} from "lucide-react";

// Helper function to format time ago
const formatTimeAgo = (date) => {
  if (!date) return "Unknown";
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};
// Helper function to get activity icon
const getActivityIcon = (activityType) => {
  switch (activityType) {
    case "VIEWED":
      return Eye;
    case "DOWNLOADED":
      return Download;
    case "SHARED":
      return Share2;
    case "EMAILED":
      return Mail;
    case "LINK_COPIED":
      return Link2;
    default:
      return FileText;
  }
};

// Helper function to get activity label
const getActivityLabel = (activityType) => {
  switch (activityType) {
    case "VIEWED":
      return "Viewed by Admin";
    case "DOWNLOADED":
      return "Downloaded PDF Receipt";
    case "SHARED":
      return "Shared with Tenant";
    case "EMAILED":
      return "Email Receipt Sent";
    case "LINK_COPIED":
      return "Payment Link Copied";
    case "EXPORTED_PDF":
      return "Page Exported as PDF";
    default:
      return "Activity";
  }
};

export default function payments() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  // Log activity
  const logActivity = useCallback(
    async (activityType, metadata = {}) => {
      try {
        await api.post(`api/payment/log-activity/${id}`, {
          activityType,
          metadata,
        });
      } catch (error) {
        console.error("Error logging activity:", error);
        // Don't show error toast for activity logging failures
      }
    },
    [id]
  );

  // Fetch payment and activities
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentRes, activitiesRes] = await Promise.all([
          api.get(`api/payment/get-payment-by-id/${id}`),
          api
            .get(`api/payment/get-activities/${id}`)
            .catch(() => ({ data: { data: [] } })),
        ]);
        setPayment(paymentRes.data.data);
        setActivities(activitiesRes.data.data || []);

        // Log VIEWED activity when page loads
        if (paymentRes.data.data) {
          logActivity("VIEWED").catch(() => {
            // Silently fail - don't disrupt user experience
          });
        }
      } catch (error) {
        console.error("Error fetching payment data:", error);
        toast.error("Failed to load payment details");
      }
    };

    fetchData();
  }, [id, logActivity]);

  // Download PDF Receipt
  const handleDownloadPDF = async () => {
    if (!payment?.receipt?.url) {
      toast.error("Receipt PDF not available yet. Please try again later.");
      return;
    }

    try {
      // Log the download activity
      await logActivity("DOWNLOADED");

      // Open the PDF URL in a new tab to download
      const link = document.createElement("a");
      link.href = payment.receipt.url;
      link.target = "_blank";
      link.download = `receipt-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("PDF receipt downloaded successfully");

      // Refresh activities
      const activitiesRes = await api.get(`api/payment/get-activities/${id}`);
      setActivities(activitiesRes.data.data || []);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF receipt");
    }
  };

  // Copy Payment Link
  const handleCopyLink = async () => {
    try {
      const paymentUrl = `${window.location.origin}/payments/${id}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(paymentUrl);

      // Log the activity
      await logActivity("LINK_COPIED", { url: paymentUrl });

      toast.success("Payment link copied to clipboard");

      // Refresh activities
      const activitiesRes = await api.get(`api/payment/get-activities/${id}`);
      setActivities(activitiesRes.data.data || []);
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy payment link");
    }
  };

  // Email Receipt
  const handleEmailReceipt = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post(`api/payment/send-receipt/${id}`);

      if (res.data.success) {
        // Log the activity
        await logActivity("EMAILED", {
          emailSentTo: res.data.data?.emailSentTo,
        });

        toast.success(
          `Receipt sent successfully to ${
            res.data.data?.emailSentTo || "tenant"
          }`
        );

        // Refresh activities
        const activitiesRes = await api.get(`api/payment/get-activities/${id}`);
        setActivities(activitiesRes.data.data || []);
      } else {
        toast.error(res.data.message || "Failed to send receipt email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to send receipt email";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Export Page as PDF using react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `payment-details-${id}`,
    onBeforeGetContent: () => {
      // Hide the Quick Actions card before printing
      const quickActionsCard = document.getElementById('quick-actions-card');
      if (quickActionsCard) {
        quickActionsCard.style.display = 'none';
      }
      // Ensure ref is ready
      if (!printRef.current) {
        return Promise.reject(new Error("Content not ready"));
      }
      return Promise.resolve();
    },
    onAfterPrint: async () => {
      // Show the Quick Actions card after printing
      const quickActionsCard = document.getElementById('quick-actions-card');
      if (quickActionsCard) {
        quickActionsCard.style.display = '';
      }
      // Log the activity
      try {
        await logActivity("EXPORTED_PDF");
        toast.success("Page printed successfully");
      } catch (error) {
        console.error("Error logging activity:", error);
      }
    },
    onPrintError: (error) => {
      console.error("Error printing:", error);
      toast.error("Failed to print page");
    },
  });

  const handleExportPageAsPDF = () => {
    if (!printRef.current) {
      toast.error("Content not ready for printing");
      return;
    }
    if (!payment) {
      toast.error("Payment data not loaded yet");
      return;
    }
    handlePrint();
  };

  return (
    <>
  <div className="flex flex-col lg:flex-row gap-4 px-2 sm:px-4 lg:px-0">

  <div id="payment-details-container" ref={printRef} className="w-full lg:flex-2">
          <div className="w-full ">
            <Card className="w-full mt-4 sm:mt-6">
              <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold">
                      Payment Details
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">
                      Unique Transaction ID: {id}
                    </p>
                  </div>
                  <div className="">
                    <Badge className="bg-green-50 text-green-600 border-green-600 h-8 w-fit text-xs sm:text-sm">
                      <LightbulbIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {payment?.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
          <div className="w-full ">
            <Card className="mt-4 sm:mt-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                    <Building2Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white bg-blue-200 rounded-md p-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl sm:text-2xl font-bold break-words">
                        {payment?.rent?.property?.name}{" "}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        kathmandu,Nepal
                      </p>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground sm:ml-auto w-full sm:w-auto">
                      <p className="text-xs sm:text-sm text-black font-bold text-left sm:text-right mb-2">
                        Official Receipt
                      </p>
                      <p className="break-words text-left sm:text-right">{payment?.receipt?.publicId}</p>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
              </CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-1">
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-sm sm:text-base font-semibold">TENANT INFORMATION</p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-2">
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Full Name:</p>
                        <p className="text-sm sm:text-base break-words">{payment?.rent?.tenant?.name}</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">
                          Phone Number:{" "}
                        </p>
                        <p className="text-sm sm:text-base">{payment?.rent?.tenant?.phoneNumber}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">
                          Unit number:{" "}
                        </p>
                        <p className="text-sm sm:text-base break-words">{payment?.rent?.tenant?.units?.name} unit 404</p>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <div className="flex-1">
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-sm sm:text-base font-semibold">TRANSACTION DETAILS</p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-2">
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Date AD :</p>
                        <p className="text-sm sm:text-base">
                          {new Date(payment?.paymentDate).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">
                          BankName_Type:{" "}
                        </p>
                        <p className="text-sm sm:text-base break-words">{payment?.bankAccount?.bankName}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Date BS :</p>
                        <p className="text-sm sm:text-base">
                          {" "}
                          {new Date(payment?.nepaliDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mx-2 sm:mx-4">
                <div>
                  <p className="text-gray-500 font-semibold text-base sm:text-lg">
                    TOTAL AMOUNT PAID
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-gray-500 text-2xl sm:text-3xl font-bold">
                    ₹ {payment?.amount?.toLocaleString()}
                  </p>
                  <p className="text-black text-xs sm:text-sm mt-1 break-words">
                    {payment?.amount?.toString()} Nepali Rupees Only
                  </p>
                </div>
              </div>
              <div className="p-3 sm:p-4 rounded-lg mt-4 sm:mt-6 mx-2 sm:mx-4">
                <h2 className="text-black text-base sm:text-lg font-semibold mb-4 sm:mb-8">
                  VERIFICATION LIFECYCLE
                </h2>
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                  {/* Connecting Line - Hidden on mobile, shown on desktop */}
                  <div className="hidden sm:block absolute top-6 left-0 right-0 h-0.5 bg-black"></div>

                  {/* Stage 1: Payment Initiated */}
                  <div className="relative flex flex-col items-center z-10 w-full sm:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black flex items-center justify-center mb-2 sm:mb-3">
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-black text-xs sm:text-sm font-medium text-center">
                      Payment Initiated
                    </p>
                    <p className="text-black text-xs mt-1 text-center">
                      {new Date(payment?.paymentDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Stage 2: Bank Verified */}
                  <div className="relative flex flex-col items-center z-10 w-full sm:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black flex items-center justify-center mb-2 sm:mb-3">
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-black text-xs sm:text-sm font-medium text-center">
                      Bank Verified
                    </p>
                    <p className="text-black text-xs mt-1 text-center break-words">
                      {payment?.bankVerifiedDate} 12 Oct, 11:40 AM
                    </p>
                  </div>

                  {/* Stage 3: Receipt Generated */}
                  <div className="relative flex flex-col items-center z-10 w-full sm:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black flex items-center justify-center mb-2 sm:mb-3">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-black text-xs sm:text-sm font-medium text-center">
                      Receipt Generated
                    </p>
                    <p className="text-black text-xs mt-1 text-center">
                      {new Date(
                        payment?.receiptGeneratedDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                  <div className="flex-1">
                    <p className="text-sm sm:text-base font-semibold">NOTES/REMARKS</p>
                    <p className="text-gray-500 text-xs sm:text-sm mt-2 break-words">
                      {payment?.notes}
                    </p>
                  </div>
                  <div className="flex-1 sm:flex-none sm:ml-4">
                    <p className="text-sm sm:text-base font-semibold mt-2"> AUTHORIZED BY </p>
                    <Separator className="my-2 sm:my-4" />
                    <p className="text-gray-500 text-xs sm:text-sm font-semibold mt-2 break-words">
                      {payment?.createdBy?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div id="quick-actions-card" className="w-full lg:w-1/3">
          <Card className="mt-4 sm:mt-6">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              {/* Quick Actions Section */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center mb-3 sm:mb-4">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Quick Actions</h3>
                </div>
                  <div className="space-y-2 sm:space-y-3">
                  <Button
    className="w-full justify-start text-xs sm:text-sm"
    variant="outline"
    onClick={handleExportPageAsPDF}
  >
    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
    Export Page as PDF
  </Button>
  </div>
                  <div className="space-y-2 sm:space-y-3 mt-2">
                  <Button
                    className="w-full justify-start text-xs sm:text-sm"
                    variant="default"
                    onClick={handleDownloadPDF}
                    disabled={!payment?.receipt?.url}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Download PDF Receipt
                  </Button>
                  <Button
                    className="w-full justify-start text-xs sm:text-sm"
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    <Link2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Copy Payment Link
                  </Button>
                  <Button
                    className="w-full justify-start text-xs sm:text-sm"
                    variant="outline"
                    onClick={handleEmailReceipt}
                    disabled={loading}
                  >
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    {loading ? "Sending..." : "Email Receipt"}
                  </Button>
                </div>
              </div>

              {/* History Section */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">HISTORY</h3>
                <div className="space-y-3 sm:space-y-4">
                  {activities.length > 0 ? (
                    activities.slice(0, 5).map((activity) => {
                      const IconComponent = getActivityIcon(
                        activity.activityType
                      );
                      return (
                        <div key={activity._id} className="flex items-start">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2 sm:mr-3 shrink-0">
                            <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium break-words">
                              {getActivityLabel(activity.activityType)}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {formatTimeAgo(activity.createdAt)}
                            </p>
                            {activity.performedBy && (
                              <p className="text-xs text-muted-foreground mt-1 break-words">
                                by {activity.performedBy?.name || "Admin"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      No activity history yet
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
