/**
 * Electricity page: data fetching, layout, and composition.
 * Composes hooks + presentational components; no UI logic in hooks.
 * Connected to backend: GET readings with filters, POST create-reading for new rows.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import useProperty from "../hooks/use-property";
import useUnits from "../hooks/use-units";
import api from "../../plugins/axios";
import { useElectricityData } from "./hooks/useElectricityData";
import { useNewElectricityRows } from "./hooks/useNewElectricityRows";
import { ElectricityHeader } from "./components/ElectricityHeader";
import { ElectricityFilters } from "./components/ElectricityFilters";
import { ElectricitySummaryCards } from "./components/ElectricitySummaryCards";
import { ElectricityTable } from "./components/ElectricityTable";
import { createReading } from "./utils/electricityApi";
import {
  parseNepaliMonthString,
  getConsumption,
  formatConsumption,
  getTrendPercent,
} from "./utils/electricityCalculations";
import { DEFAULT_RATE_PER_UNIT } from "./utils/electricityConstants";
import { NEPALI_MONTHS, getCurrentNepaliMonthYear } from "@/constants/nepaliMonths";

const buildDefaultFilterValues = () => {
  const { month, year } = getCurrentNepaliMonthYear();
  const monthLabel = NEPALI_MONTHS.find((m) => m.value === month)?.label ?? "Baisakh";
  return {
    blockId: "",
    innerBlockId: "",
    nepaliMonth: `${monthLabel} ${year}`,
    compareWithPrevious: true,
  };
};

export default function ElectricityPage() {
  const { property } = useProperty();
  const { units } = useUnits({ occupied: true });
  const [tenants, setTenants] = useState([]);
  const [filterValues, setFilterValues] = useState(buildDefaultFilterValues);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const allBlocks = useMemo(() => {
    if (!property || !Array.isArray(property)) return [];
    return property.flatMap((prop) => prop.blocks || []);
  }, [property]);

  const selectedBlock = useMemo(
    () => allBlocks.find((block) => block._id === filterValues.blockId),
    [allBlocks, filterValues.blockId]
  );

  const propertyIdFromBlock = useMemo(() => {
    if (!filterValues.blockId || !property || !Array.isArray(property)) return undefined;
    for (const prop of property) {
      if (prop.blocks?.some((b) => b._id === filterValues.blockId)) return prop._id;
    }
    return undefined;
  }, [filterValues.blockId, property]);

  const nepaliParsed = useMemo(
    () => parseNepaliMonthString(filterValues.nepaliMonth),
    [filterValues.nepaliMonth]
  );

  const apiFilters = useMemo(
    () => ({
      propertyId: propertyIdFromBlock || undefined,
      blockId: filterValues.blockId || undefined,
      innerBlockId: filterValues.innerBlockId || undefined,
      nepaliYear: nepaliParsed?.year,
      nepaliMonth: nepaliParsed?.month,
    }),
    [
      propertyIdFromBlock,
      filterValues.blockId,
      filterValues.innerBlockId,
      nepaliParsed?.year,
      nepaliParsed?.month,
    ]
  );

  const { readings, summary, loading, refetch } = useElectricityData(apiFilters);
  const { newRows, addNewRow, updateNewRow, removeNewRow, clearNewRows } =
    useNewElectricityRows({
      readings,
      units: Array.isArray(units) ? units : [],
    });

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await api.get("/api/tenant/get-tenants");
        const data = response.data;
        if (data?.tenants) setTenants(Array.isArray(data.tenants) ? data.tenants : []);
      } catch (err) {
        console.error("Error fetching tenants:", err);
      }
    };
    fetchTenants();
  }, []);

  const unitIdToTenantId = useMemo(() => {
    const map = {};
    for (const tenant of tenants) {
      const unitIds = tenant.units;
      if (Array.isArray(unitIds)) {
        for (const u of unitIds) {
          const id = u?._id ?? u;
          if (id) map[id] = tenant._id;
        }
      }
    }
    return map;
  }, [tenants]);

  const availableInnerBlocks = useMemo(
    () => (Array.isArray(selectedBlock?.innerBlocks) ? selectedBlock.innerBlocks : []),
    [selectedBlock]
  );

  const handleFilterChange = useCallback((field, value) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleExportReport = useCallback(() => {
    if (!readings.length) {
      toast.error("No readings to export.");
      return;
    }
    const period = filterValues.nepaliMonth?.trim() || "Report";
    const escapeCsv = (val) => {
      const s = String(val ?? "");
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = [];
    rows.push("Electricity Report", period, "");
    rows.push(
      "Total Readings,Total Consumption (kWh),Avg per Unit (kWh),Total Amount (Rs),Total Paid (Rs),Total Pending (Rs)"
    );
    rows.push(
      [
        summary.totalReadings ?? 0,
        summary.totalConsumption ?? 0,
        summary.averageConsumption ?? 0,
        summary.totalAmount ?? 0,
        summary.totalPaid ?? 0,
        summary.totalPending ?? 0,
      ].join(",")
    );
    rows.push("");
    rows.push(
      "Unit Name,Previous (kWh),Current (kWh),Consumption (kWh),Status,Trend (%)"
    );
    readings.forEach((record, index) => {
      const unitName =
        record.unit?.name ??
        record.unit?.unitName ??
        `Unit ${index + 1}`;
      const prev = Number(record.previousReading) || 0;
      const curr = Number(record.currentReading) || 0;
      const consumption = getConsumption(record);
      const status = record.status || "pending";
      const trend = getTrendPercent(consumption, prev);
      const trendSign = parseFloat(trend) > 0 ? "+" : "";
      rows.push(
        [
          escapeCsv(unitName),
          prev > 0 ? prev.toFixed(1) : "",
          curr > 0 ? curr.toFixed(1) : "",
          consumption > 0 ? formatConsumption(consumption) : "",
          status,
          prev > 0 ? `${trendSign}${trend}` : "",
        ].join(",")
      );
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `electricity-report-${period.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported.");
  }, [readings, summary, filterValues.nepaliMonth]);

  const handleSaveReadings = useCallback(async () => {
    const validRows = newRows.filter(
      (row) =>
        row.unitId &&
        row.currentUnit != null &&
        row.currentUnit !== "" &&
        parseFloat(row.currentUnit) >= parseFloat(row.previousUnit || 0)
    );
    if (validRows.length === 0) {
      toast.error("Add at least one valid reading (unit, previous and current reading).");
      return;
    }
    const tenantIdMissing = validRows.find((row) => !unitIdToTenantId[row.unitId]);
    if (tenantIdMissing) {
      toast.error("Selected unit has no tenant. Only units assigned to a tenant can have readings.");
      return;
    }
    const nepali = nepaliParsed;
    if (!nepali) {
      toast.error("Enter a valid Nepali month (e.g. Ashwin 2081).");
      return;
    }
    const now = new Date();
    setSaving(true);
    try {
      await Promise.all(
        validRows.map((row) =>
          createReading({
            tenantId: unitIdToTenantId[row.unitId],
            unitId: row.unitId,
            currentReading: parseFloat(row.currentUnit),
            previousReading: parseFloat(row.previousUnit || 0),
            ratePerUnit: DEFAULT_RATE_PER_UNIT,
            nepaliMonth: nepali.month,
            nepaliYear: nepali.year,
            nepaliDate: filterValues.nepaliMonth?.trim() || `${nepali.year}-${nepali.month}`,
            englishMonth: now.getMonth() + 1,
            englishYear: now.getFullYear(),
            readingDate: now.toISOString(),
          })
        )
      );
      toast.success(`${validRows.length} reading(s) saved.`);
      clearNewRows();
      refetch();
    } catch (err) {
      toast.error(err?.message || "Failed to save readings.");
    } finally {
      setSaving(false);
    }
  }, [newRows, unitIdToTenantId, nepaliParsed, filterValues.nepaliMonth, clearNewRows, refetch]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <div>
        <div className="mt-4">
          <ElectricityHeader
            onExportReport={handleExportReport}
            onAddReading={addNewRow}
            onSaveReadings={handleSaveReadings}
            hasNewRows={newRows.length > 0}
            saving={saving}
          />

          <ElectricityFilters
            filterValues={filterValues}
            onChange={handleFilterChange}
            allBlocks={allBlocks}
            availableInnerBlocks={availableInnerBlocks}
          />

          <ElectricitySummaryCards summary={summary} />

          <ElectricityTable
            loading={loading}
            readings={readings}
            newRows={newRows}
            units={Array.isArray(units) ? units : []}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onUpdateNewRow={updateNewRow}
            onRemoveNewRow={removeNewRow}
            onPaymentRecorded={refetch}
          />
        </div>
      </div>
    </form>
  );
}
