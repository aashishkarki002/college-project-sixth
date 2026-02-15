import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Eye } from "lucide-react";
import { Mail } from "lucide-react";
import { House } from "lucide-react";
import { Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import api from "../../plugins/axios";
import { toast } from "sonner";
import NepaliDate from "nepali-datetime";
import { Building } from "lucide-react";
export default function TenantCard({ tenant, HandleDeleteTenant }) {
  // Convert English date to Nepali date
  // Handle ISO format dates (e.g., "2024-01-15T00:00:00.000Z") from backend
  let nepaliDate = null;
  let nepaliDateString = "";

  if (tenant?.leaseEndDate) {
    try {
      // Extract YYYY-MM-DD from ISO date string or use as-is if already in that format
      const dateStr = tenant.leaseEndDate.includes("T")
        ? tenant.leaseEndDate.split("T")[0]
        : tenant.leaseEndDate;
      nepaliDate = NepaliDate.parseEnglishDate(dateStr, "YYYY-MM-DD");
      nepaliDateString = nepaliDate.format("YYYY-MMM-DD");
    } catch (error) {
      console.error("Error converting date to Nepali:", error);
      nepaliDateString = "Invalid date";
    }
  }
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const DeleteTenant = async () => {
    try {
      if (!tenant?._id) {
        toast.error("Tenant ID is missing");
        console.error("Tenant ID is undefined:", tenant);
        return;
      }

      const response = await api.patch(
        `/api/tenant/delete-tenant/${tenant._id}`
      );

      if (response.data.success) {
        toast.success(response.data.message);
        HandleDeleteTenant();
      } else {
        toast.error(response.data.message || "Failed to delete tenant");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      if (error.response) {
        // Server responded with error status
        toast.error(
          error.response.data?.message || `Error: ${error.response.status}`
        );
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        // Request was made but no response received
        toast.error("No response from server. Please check your connection.");
      } else {
        // Error setting up the request
        toast.error(error.message || "An error occurred while deleting tenant");
      }
    }
  };
  const frequencyConfig = {
    monthly: {
      label: "Monthly",
      className: "bg-blue-50 text-blue-600 border-blue-600",
    },
    quarterly: {
      label: "Quarterly",
      className: "bg-purple-50 text-purple-600 border-purple-600",
    },
  };

  const frequency =
    frequencyConfig[tenant?.rentPaymentFrequency] || {
      label: "N/A",
      className: "bg-gray-50 text-gray-600 border-gray-400",
    };
  const rentDisplay =
    tenant?.rentPaymentFrequency === "monthly"
      ? tenant?.totalRentFormatted
      : tenant?.rentPaymentFrequency === "quarterly"
        ? tenant?.quarterlyRentAmountFormatted
        : "N/A";

  return (
    <Card className="w-full h-full hover:shadow-lg transition-shadow duration-300">
      <CardContent>
        <div className="text-center">
          <div className="flex justify-between">
            <h2 className="text-black text-lg font-semibold">{tenant?.name}</h2>
            <p>
              <DropdownMenu>
                <DropdownMenuTrigger>⋮</DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate(`/tenant/editTenant/${tenant._id}`)}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={DeleteTenant}>
                    Delete{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDialogOpen(true);
                    }}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        navigate(`/tenant/viewDetail/${tenant._id}`)
                      }
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      View Details
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </p>
          </div>

          <span className="text-gray-500 text-sm text-left flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500" />
            {tenant?.block.name}
          </span>
          <p className="text-gray-500 text-sm text-left flex items-center gap-2">
            <House className="w-4 h-4 text-gray-500" />
            {Array.isArray(tenant?.units) && tenant.units.length > 0
              ? tenant.units.map((u) => u?.name).filter(Boolean).join(", ") ||
              "—"
              : "—"}
          </p>
        </div>
        <div className="text-gray-500 text-sm mt-3">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center w-full">
              <p className="text-black text-sm">Status</p>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-600 w-20 border-green-600"
              >
                Active
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-black text-sm">Rent</p>
              <p className="text-black text-sm">{rentDisplay}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-black text-sm">Frequency</p>
              <Badge
                variant="outline"
                className={`border ${frequency.className}`}
              >
                {frequency.label}
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center w-full">
            <Badge className="bg-blue-50 text-blue-600 mr-2 w-full p-4 mt-2 rounded-md ">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-2" />
                  Lease End
                </div>
                <div>
                  <p className="text-black text-sm ml-3">
                    {nepaliDateString || "N/A"}
                  </p>
                </div>
              </div>
            </Badge>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center w-full ">
            <Button
              className="bg-gray-50 text-black mr-2 w-30  hover:bg-green-100 hover:text-green-600"
              onClick={() => {
                if (tenant?.phone) {
                  window.location.href = `tel:${tenant.phone}`;
                }
              }}
            >
              <Phone className="w-5 h-5 mr-2 stroke-black transition-colors duration-200 hover:stroke-green-600" />
              Call
            </Button>
            <Button
              className="bg-gray-50 text-black mr-2 w-30 hover:bg-blue-100 hover:text-blue-600"
              onClick={() => {
                if (tenant?.email) {
                  window.location.href = `mailto:${tenant.email}`;
                }
              }}
            >
              <Mail className="w-5 h-5 text-black mr-2  " />
              Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
