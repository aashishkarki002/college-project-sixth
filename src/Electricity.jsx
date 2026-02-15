import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Calendar } from "lucide-react";
import useProperty from "./hooks/use-property";
import useUnits from "./hooks/use-units";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormik } from "formik";
import { Zap, AlertTriangle, Home, Eye, Upload, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../plugins/axios";
import { useEffect } from "react";
export default function Electricity() {
  const [nepaliMonth, setNepaliMonth] = useState("Ashwin 2081");
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);
  const { property } = useProperty();
  const { units } = useUnits();

  const [tenants, setTenants] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [electricityData, setElectricityData] = useState({
    readings: [],
    summary: {
      totalReadings: 0,
      totalConsumption: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
      averageConsumption: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [newRows, setNewRows] = useState([]);

  useEffect(() => {
    const getTenants = async () => {
      const response = await api.get("/api/tenant/get-tenants");
      const data = await response.data;
      setTenants(data.tenants);
    };
    getTenants();
  }, []);

  useEffect(() => {
    const getElectricityData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/electricity/get-readings");
        const data = response.data;
        // Backend returns: { success, data: { readings, summary } }
        if (data && data.data) {
          setElectricityData(data.data);
        } else {
          setElectricityData({
            readings: [],
            summary: {
              totalReadings: 0,
              totalConsumption: 0,
              totalAmount: 0,
              totalPaid: 0,
              totalPending: 0,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching electricity data:", error);
        setElectricityData({
          readings: [],
          summary: {
            totalReadings: 0,
            totalConsumption: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };
    getElectricityData();
  }, []);

  const summary = electricityData.summary || {
    totalReadings: 0,
    totalConsumption: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
  };

  const readings = electricityData.readings || [];
  const formik = useFormik({
    initialValues: {
      blockId: "",
      innerBlockId: "",
      nepaliMonth: "",
      compareWithPrevious: true,
      totalConsumption: 0,
      averagePerUnit: 0,
      totalBillAmount: 0,
    },
    onSubmit: (values) => {
      console.log(values);
    },
  });

  // Get all blocks from all properties (flatten)
  const allBlocks = property && Array.isArray(property) && property.length > 0
    ? property.flatMap(prop => prop.blocks || [])
    : [];

  // Get innerBlocks from selected block
  const selectedBlock = allBlocks.find(block => block._id === formik.values.blockId);
  const availableInnerBlocks = selectedBlock?.innerBlocks || [];

  const exportReport = () => {
    // Export report functionality
    console.log("Export report");
  };

  const addNewRow = () => {
    const newRow = {
      id: Date.now(), // Temporary ID for new rows
      unitId: "",
      unitName: "",
      previousUnit: "",
      currentUnit: "",
      consumption: "",
      status: "pending",
      isNew: true, // Flag to identify new rows
    };
    setNewRows([...newRows, newRow]);
  };

  const updateNewRow = (id, field, value) => {
    setNewRows(newRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };

        // When unit is selected, auto-populate previous unit from most recent electricity record
        if (field === 'unitId' && value) {
          const selectedUnit = units && Array.isArray(units) ? units.find(u => u._id === value) : null;
          if (selectedUnit) {
            updated.unitName = selectedUnit.name;
            updated.unitId = value;

            // Find the most recent electricity record for this unit
            const unitRecords = readings
              .filter(record => {
                const recordUnitId = record.unit?._id || record.unit;
                return recordUnitId === value;
              })
              .sort((a, b) => {
                // Sort by date (most recent first)
                const dateA = new Date(a.createdAt || a.nepaliDate || 0);
                const dateB = new Date(b.createdAt || b.nepaliDate || 0);
                return dateB - dateA;
              });

            if (unitRecords.length > 0) {
              const mostRecent = unitRecords[0];
              // Use currentUnit from most recent record as previousUnit for new reading
              updated.previousUnit = mostRecent.currentUnit || mostRecent.previousUnit || "";
            }
          }
        }

        // Auto-calculate consumption if both previous and current units are provided
        if (field === 'previousUnit' || field === 'currentUnit') {
          const prev = field === 'previousUnit' ? parseFloat(value) || 0 : parseFloat(updated.previousUnit) || 0;
          const curr = field === 'currentUnit' ? parseFloat(value) || 0 : parseFloat(updated.currentUnit) || 0;
          updated.consumption = (curr - prev).toFixed(1);
        }
        return updated;
      }
      return row;
    }));
  };

  const removeNewRow = (id) => {
    setNewRows(newRows.filter(row => row.id !== id));
  };

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        <div>
          <div className="flex justify-between">
            <div>
              <p className="text-2xl font-bold">Utility Monitoring</p>
              <p className="text-gray-500 text-sm">
                Detailed electricity consumption tracking for buildings
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-gray-100 text-black hover:bg-gray-200" onClick={exportReport}>
                <PlusIcon className="w-5 h-5" />
                Export Report

              </Button>
              <Button
                type="button"
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={addNewRow}
              >
                <PlusIcon className="w-5 h-5" />
                Add Reading
              </Button>
            </div>
          </div>
          <div className="mt-4  ">

            <Card className="  rounded-lg shadow-lg">
              <CardContent className="p-5 ">
                <div className="flex items-center gap-6 flex-wrap">
                  {/* BLOCK Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className=" text-xs font-semibold uppercase tracking-wide">
                      BLOCK:
                    </label>
                    <Select
                      value={formik.values.blockId}
                      onValueChange={(value) => {
                        formik.setFieldValue("blockId", value);
                        formik.setFieldValue("innerBlockId", ""); // Reset innerBlock when block changes
                      }}
                    >
                      <SelectTrigger className="w-[150px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                        {allBlocks.length > 0 ? (
                          allBlocks.map((block) => (
                            <SelectItem key={block._id} value={block._id}>
                              {block.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-block" disabled>
                            No blocks available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* INNER BLOCK Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className=" text-xs font-semibold uppercase tracking-wide">
                      INNER BLOCK:
                    </label>
                    <Select
                      value={formik.values.innerBlockId}
                      onValueChange={(value) => formik.setFieldValue("innerBlockId", value)}
                      disabled={!formik.values.blockId}
                    >
                      <SelectTrigger className="w-[130px] h-9 bg-gray-100 text-black hover:bg-gray-200">
                        <SelectValue placeholder="Select inner block" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-100 text-black hover:bg-gray-200">
                        {availableInnerBlocks.length > 0 ? (
                          availableInnerBlocks.map((innerBlock) => (
                            <SelectItem key={innerBlock._id} value={innerBlock._id}>
                              {innerBlock.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-inner-block" disabled>
                            {formik.values.blockId ? "No inner blocks available" : "Select block first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* NEPALI MONTH Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className=" text-xs font-semibold uppercase tracking-wide">
                      NEPALI MONTH:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={nepaliMonth}
                        onChange={(e) => setNepaliMonth(e.target.value)}
                        className="w-[170px] h-9 bg-gray-100 text-black hover:bg-gray-200 rounded-md px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50"
                        placeholder="Ashwin 2081"
                      />
                      <Calendar className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    </div>
                  </div>

                  {/* Compare with Previous Toggle */}
                  <div className="flex flex-col gap-4">
                    <label className=" text-xs font-semibold uppercase tracking-wide">
                      Compare with Previous
                    </label>
                    <button
                      type="button"
                      onClick={() => setCompareWithPrevious(!compareWithPrevious)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-slate-800 ${compareWithPrevious ? "bg-blue-500" : "bg-gray-200"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${compareWithPrevious ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>

                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between gap-4 mt-4">
              {/* TOTAL CONSUMPTION CARD */}
              <Card className="rounded-lg shadow-lg w-full bg-white text-black">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
                    TOTAL CONSUMPTION
                  </CardTitle>
                  <Zap className="w-5 h-5 text-black" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold">
                    {summary.totalConsumption}
                    <span className="text-lg font-medium text-gray-500 align-top">
                      kWh
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold text-black">+5.2%</span>{" "}
                    <span className="text-gray-500">vs last month</span>
                  </p>
                </CardContent>
              </Card>

              {/* AVG. PER UNIT CARD */}
              <Card className="rounded-lg shadow-lg w-full bg-white text-black">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
                    AVG. PER UNIT
                  </CardTitle>
                  <Zap className="w-5 h-5 text-black" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold">
                    {summary.averageConsumption} {" "}
                    <span className="text-lg font-medium text-gray-500 align-top">
                      kWh/unit
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Average consumption per unit
                  </p>
                </CardContent>
              </Card>

              {/* TOTAL BILL AMOUNT CARD */}
              <Card className="rounded-lg shadow-lg w-full bg-white text-black">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold tracking-wide text-gray-500">
                    TOTAL BILL AMOUNT
                  </CardTitle>
                  <Zap className="w-5 h-5 text-black" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold">Rs. {summary.totalAmount}</div>
                  <p className="mt-2 text-xs text-gray-500">
                    Total amount for the selected period
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Unit Breakdown Table */}
            <Card className="rounded-lg shadow-lg mt-4 bg-white">
              <CardContent className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-4">Unit Breakdown</h3>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        setActiveTab("all");
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "all"
                        ? "bg-gray-200 text-black"
                        : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      All Units
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("flagged");
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "flagged"
                        ? "bg-red-100 text-red-600"
                        : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      Flagged ({readings.filter(record => {
                        const consumption =
                          record.consumption ||
                          ((record.currentReading || 0) - (record.previousReading || 0));
                        return consumption > 200;
                      }).length})
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : readings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No electricity data available</div>
                    ) : (() => {
                      const filteredData = readings.filter(record => {
                        if (activeTab === "flagged") {
                          const consumption =
                            record.consumption ||
                            ((record.currentReading || 0) - (record.previousReading || 0));
                          return consumption > 200;
                        }
                        return true;
                      });

                      return (
                        <>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  UNIT NAME
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  PREV (KWH)
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  CURR (KWH)
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  CONSUMPTION
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  STATUS
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  TREND
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  RECEIPTS
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* New editable rows */}
                              {newRows.map((newRow) => (
                                <tr
                                  key={newRow.id}
                                  className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50"
                                >
                                  <td className="py-3 px-4">
                                    <Select
                                      value={newRow.unitId || ""}
                                      onValueChange={(value) => updateNewRow(newRow.id, 'unitId', value)}
                                    >
                                      <SelectTrigger className="w-full h-9 bg-white border border-gray-300 text-sm">
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        {units && Array.isArray(units) && units.length > 0 ? (
                                          units.map((unit) => (
                                            <SelectItem key={unit._id} value={unit._id}>
                                              {unit.name}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="no-units" disabled>
                                            No units available
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={newRow.previousUnit}
                                      onChange={(e) => updateNewRow(newRow.id, 'previousUnit', e.target.value)}
                                      placeholder="0.0"
                                      className="w-full px-3 py-2 h-9 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={newRow.currentUnit}
                                      onChange={(e) => updateNewRow(newRow.id, 'currentUnit', e.target.value)}
                                      placeholder="0.0"
                                      className="w-full px-3 py-2 h-9 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm font-medium text-blue-600">
                                      {newRow.consumption || "0.0"} kWh
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Select
                                      value={newRow.status}
                                      onValueChange={(value) => updateNewRow(newRow.id, 'status', value)}
                                    >
                                      <SelectTrigger className="w-full h-9 bg-white border border-gray-300 text-xs font-medium">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        <SelectItem value="pending">PENDING</SelectItem>
                                        <SelectItem value="paid">PAID</SelectItem>
                                        <SelectItem value="overdue">OVERDUE</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm text-gray-400">-</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeNewRow(newRow.id)}
                                      className="h-8 text-xs"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              {filteredData
                                .slice((currentPage - 1) * 12, currentPage * 12)
                                .map((record, index) => {
                                  const unitName =
                                    record.unit?.name ||
                                    record.unit?.unitName ||
                                    `Unit ${index + 1}`;
                                  const previousReading = record.previousReading || 0;
                                  const currentReading = record.currentReading || 0;
                                  const consumption =
                                    record.consumption ||
                                    (currentReading - previousReading) ||
                                    0;
                                  const status = record.status || "pending";

                                  // Calculate trend (simplified - comparing consumption with previous reading)
                                  const trend =
                                    previousReading > 0
                                      ? (((consumption / previousReading) - 1) * 100).toFixed(1)
                                      : "0.0";
                                  const trendColor =
                                    parseFloat(trend) > 0 ? "text-red-500" : "text-green-500";
                                  const trendSign = parseFloat(trend) > 0 ? "+" : "";

                                  // Check for high usage alert (if consumption is more than 200 kWh)
                                  const hasHighUsage = consumption > 200;

                                  // Status badge styling
                                  const getStatusBadge = (status) => {
                                    switch (status.toLowerCase()) {
                                      case "paid":
                                        return "bg-green-100 text-green-700";
                                      case "pending":
                                        return "bg-orange-100 text-orange-700";
                                      case "overdue":
                                        return "bg-red-100 text-red-700";
                                      default:
                                        return "bg-gray-100 text-gray-700";
                                    }
                                  };

                                  const statusLabel = status === "pending" ? "PENDING" : status.toUpperCase();

                                  return (
                                    <tr
                                      key={record._id || index}
                                      className={`border-b border-gray-100 hover:bg-gray-50 ${hasHighUsage ? "relative" : ""}`}
                                    >
                                      <td className="py-3 px-4 relative">
                                        {hasHighUsage && (
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                        )}
                                        <div className={`flex items-center gap-2 ${hasHighUsage ? "pl-2" : ""}`}>
                                          {hasHighUsage ? (
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                          ) : (
                                            <Home className="w-4 h-4 text-gray-400" />
                                          )}
                                          <div>
                                            <div className="font-medium">{unitName}</div>
                                            {hasHighUsage && (
                                              <div className="text-xs text-red-500">HIGH USAGE ALERT</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-sm">
                                        {previousReading > 0 ? previousReading.toFixed(1) : "-"}
                                      </td>
                                      <td className="py-3 px-4 text-sm">
                                        {currentReading > 0 ? currentReading.toFixed(1) : "-"}
                                      </td>
                                      <td className="py-3 px-4">
                                        {consumption > 0 ? (
                                          <span className="text-sm font-medium text-blue-600">
                                            {consumption.toLocaleString("en-US", {
                                              minimumFractionDigits: 1,
                                              maximumFractionDigits: 1,
                                            })}{" "}
                                            kWh
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(status)}`}>
                                          {statusLabel}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4">
                                        {previousReading > 0 ? (
                                          <span className={`text-sm font-medium ${trendColor}`}>
                                            {trendSign}{trend}%
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {record.billMedia?.url ? (
                                          <a
                                            href={record.billMedia.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block"
                                          >
                                            <FileText className="w-4 h-4 text-blue-500 cursor-pointer hover:text-blue-700" />
                                          </a>
                                        ) : (
                                          <Button className="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1">
                                            <Upload className="w-3 h-3" />
                                            UPLOAD
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                          {/* Pagination */}
                          {filteredData.length > 0 && (
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                              <div className="text-sm text-gray-600">
                                Showing {Math.min((currentPage - 1) * 12 + 1, filteredData.length)}-{Math.min(currentPage * 12, filteredData.length)} of {filteredData.length} units
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  disabled={currentPage === 1}
                                  className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                {Array.from({ length: Math.ceil(filteredData.length / 12) }, (_, i) => i + 1)
                                  .slice(0, 5)
                                  .map((page) => (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPage(page)}
                                      className={`px-3 py-1 rounded text-sm font-medium ${currentPage === page
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                    >
                                      {page}
                                    </button>
                                  ))}
                                <button
                                  onClick={() => setCurrentPage(Math.min(Math.ceil(filteredData.length / 12), currentPage + 1))}
                                  disabled={currentPage >= Math.ceil(filteredData.length / 12)}
                                  className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </form>
    </>
  );
}