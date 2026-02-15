import React, { useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlusIcon, CarIcon, TagIcon } from "lucide-react";
import {
  Empty,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import api from "../plugins/axios";
import { AddRevenueDialog } from "./Revenue/components/AddRevenueDialog";
import { Badge } from "@/components/ui/badge";

const PARKING_CODES = ["PARKING"];
const BRAND_DEAL_CODES = ["BRAND_AD", "AD"];

export default function Revenue() {
  const [revenueList, setRevenueList] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [revenueSource, setRevenueSource] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  useEffect(() => {
    const getRevenueSource = async () => {
      try {
        const response = await api.get("/api/revenue/get-revenue-source");
        if (response.data && Array.isArray(response.data.revenueSource)) {
          setRevenueSource(response.data.revenueSource);
        } else {
          setRevenueSource([]);
        }
      } catch (error) {
        console.error("Error fetching revenue source:", error);
        setRevenueSource([]);
      }
    };
    getRevenueSource();
  }, []);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setLoadingRevenue(true);
        const response = await api.get("/api/revenue/get-all");
        const data = response.data?.revenue ?? response.data?.data ?? [];
        setRevenueList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching revenue:", error);
        setRevenueList([]);
      } finally {
        setLoadingRevenue(false);
      }
    };
    fetchRevenue();
  }, []);

  useEffect(() => {
    const getBankAccounts = async () => {
      try {
        const response = await api.get("/api/bank/get-bank-accounts");
        const data = await response.data;
        setBankAccounts(data.bankAccounts ?? []);
      } catch (error) {
        console.error("Error fetching bank accounts:", error);
        setBankAccounts([]);
      }
    };
    getBankAccounts();
  }, []);

  useEffect(() => {
    const getTenants = async () => {
      try {
        const response = await api.get("/api/tenant/get-tenants");
        const data = await response.data;
        setTenants(data.tenants ?? []);
      } catch (error) {
        console.error("Error fetching tenants:", error);
        setTenants([]);
      }
    };
    getTenants();
  }, []);

  const parkingSpots = useMemo(() => {
    return revenueList.filter((r) => {
      const code = r.source?.code ?? r.source;
      return typeof code === "string" && PARKING_CODES.includes(code);
    });
  }, [revenueList]);

  const brandDeals = useMemo(() => {
    return revenueList.filter((r) => {
      const code = r.source?.code ?? r.source;
      return typeof code === "string" && BRAND_DEAL_CODES.includes(code);
    });
  }, [revenueList]);

  const allStreams = useMemo(() => {
    return revenueList.filter((r) => {
      const code = r.source?.code ?? r.source;
      return (
        typeof code === "string" &&
        (PARKING_CODES.includes(code) || BRAND_DEAL_CODES.includes(code))
      );
    });
  }, [revenueList]);

  const refetchRevenue = async () => {
    try {
      setLoadingRevenue(true);
      const response = await api.get("/api/revenue/get-all");
      const data = response.data?.revenue ?? response.data?.data ?? [];
      setRevenueList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching revenue:", error);
    } finally {
      setLoadingRevenue(false);
    }
  };

  const getRevenueDisplayName = (item) => {
    if (item.payerType === "EXTERNAL" && item.externalPayer?.name)
      return item.externalPayer.name;
    if (item.payerType === "TENANT" && item.tenant?.name) return item.tenant.name;
    return item.source?.name ?? "Revenue";
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const renderRevenueCard = (item, icon, subtitle) => (
    <Card key={item._id} className="mt-4 w-75 ml-4">
      <CardHeader className="flex flex-row items-start justify-between">
        {icon}
        <div className="flex items-start gap-3">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">
              {getRevenueDisplayName(item)}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full text-sm w-20 border border-green-400">
          {item.status?.toUpperCase() ?? "RECORDED"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="border-t border-gray-200 pt-4 mt-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Amount · {formatDate(item.date)}
              </p>
              <p className="text-2xl font-bold text-gray-800">
                Rs. {Number(item.amount ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderParkingSpot = (item) =>
    renderRevenueCard(
      item,
      <CarIcon className="w-8 h-8 bg-blue-100 rounded-md text-blue-500 p-2" />,
      "Parking Revenue"
    );

  const renderBrandDeal = (item) =>
    renderRevenueCard(
      item,
      <TagIcon className="w-8 h-8 bg-purple-100 rounded-md text-purple-500 p-2" />,
      "Brand Deal Revenue"
    );

  return (
    <>
      <div>
        <div>
          <p className="text-2xl font-bold">Revenue Streams</p>
          <p className="text-gray-500 text-sm">
            Manage extra income sources beyond rents
          </p>
        </div>
        <Tabs className="mt-4 bg-white rounded-lg" defaultValue="allstreams">
          <TabsList className="bg-white rounded-lg hover:bg-gray-100">
            <TabsTrigger value="allstreams">All Streams</TabsTrigger>
            <TabsTrigger value="parking">Parking</TabsTrigger>
            <TabsTrigger value="brand-deals">Brand Deals</TabsTrigger>
          </TabsList>

          <TabsContent value="allstreams">
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-stretch">
                {loadingRevenue ? (
                  <Card className="w-full h-full">
                    <CardContent className="flex flex-col items-center justify-center h-full py-8">
                      <p className="text-gray-500">Loading revenue...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {allStreams.map((item) =>
                      PARKING_CODES.includes(item.source?.code)
                        ? renderParkingSpot(item)
                        : renderBrandDeal(item)
                    )}

                    {allStreams.length === 0 && (
                      <Card className="w-full h-full">
                        <CardContent className="flex flex-col items-center justify-center h-full py-8">
                          <EmptyTitle>No Revenue Streams</EmptyTitle>
                          <EmptyDescription>
                            Add parking or brand deal revenue to get started
                          </EmptyDescription>
                        </CardContent>
                      </Card>
                    )}

                    <Empty
                      className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg p-8
               flex flex-col items-center justify-center cursor-pointer
               hover:border-gray-400 transition-colors bg-white"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <Button
                        variant="outline"
                        className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <PlusIcon className="w-6 h-6 text-gray-600" />
                      </Button>
                      <p className="mt-4 text-gray-700 font-medium text-sm">
                        Add New Stream
                      </p>
                    </Empty>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="parking">
            <Card>
              <CardHeader>
                <CardTitle>Parking</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <p className="text-gray-500 py-4">Loading...</p>
                ) : parkingSpots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {parkingSpots.map(renderParkingSpot)}
                  </div>
                ) : (
                  <Card className="mt-4 w-75 ml-4">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <EmptyTitle>No Parking Revenue</EmptyTitle>
                      <EmptyDescription>
                        Add parking revenue to get started
                      </EmptyDescription>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand-deals">
            <Card>
              <CardHeader>
                <CardTitle>Brand Deals</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <p className="text-gray-500 py-4">Loading...</p>
                ) : brandDeals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {brandDeals.map(renderBrandDeal)}
                  </div>
                ) : (
                  <Card className="mt-4 w-75 ml-4">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <EmptyTitle>No Brand Deal Revenue</EmptyTitle>
                      <EmptyDescription>
                        Add brand deal revenue to get started
                      </EmptyDescription>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddRevenueDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tenants={tenants}
        revenueSource={revenueSource}
        bankAccounts={bankAccounts}
        onSuccess={refetchRevenue}
      />
    </>
  );
}