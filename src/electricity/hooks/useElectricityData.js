/**
 * Fetches electricity readings and summary from API.
 * Accepts optional filters (propertyId, nepaliYear, nepaliMonth, etc.) and refetches when they change.
 * Returns { electricityData, loading, refetch }.
 */

import { useState, useEffect, useCallback } from "react";
import { getReadings } from "../utils/electricityApi";
import { EMPTY_SUMMARY } from "../utils/electricityConstants";

const defaultData = {
  readings: [],
  summary: EMPTY_SUMMARY,
};

export function useElectricityData(filters = {}) {
  const [electricityData, setElectricityData] = useState(defaultData);
  const [loading, setLoading] = useState(false);

  const fetchReadings = useCallback(
    async (overrideFilters) => {
      const params = { ...filters, ...overrideFilters };
      try {
        setLoading(true);
        const data = await getReadings(params);
        if (data?.readings != null && data?.summary != null) {
          setElectricityData(data);
        } else {
          setElectricityData({
            readings: [],
            summary: { ...EMPTY_SUMMARY },
          });
        }
      } catch (error) {
        console.error("Error fetching electricity data:", error);
        setElectricityData({
          readings: [],
          summary: { ...EMPTY_SUMMARY },
        });
      } finally {
        setLoading(false);
      }
    },
    [
      filters.propertyId,
      filters.blockId,
      filters.innerBlockId,
      filters.unitId,
      filters.tenantId,
      filters.nepaliYear,
      filters.nepaliMonth,
      filters.status,
    ]
  );

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  return {
    electricityData,
    readings: electricityData.readings || [],
    summary: electricityData.summary || EMPTY_SUMMARY,
    loading,
    refetch: fetchReadings,
  };
}
