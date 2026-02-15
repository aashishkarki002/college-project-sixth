/**
 * Inline add/edit/remove logic for new reading rows.
 * Auto-fills previousReading from most recent reading for selected unit;
 * consumption = currentUnit - previousUnit.
 * No JSX.
 */

import { useState, useCallback } from "react";
import { DEFAULT_NEW_ROW_STATUS } from "../utils/electricityConstants";

/**
 * @param {Object} options
 * @param {Array} options.readings - existing electricity readings (for previous unit lookup)
 * @param {Array} [options.units] - list of units { _id, name }
 */
export function useNewElectricityRows({ readings = [], units = [] }) {
  const [newRows, setNewRows] = useState([]);

  const addNewRow = useCallback(() => {
    const row = {
      id: Date.now(),
      unitId: "",
      unitName: "",
      previousUnit: "",
      currentUnit: "",
      consumption: "",
      status: DEFAULT_NEW_ROW_STATUS,
      isNew: true,
    };
    setNewRows((prev) => [...prev, row]);
  }, []);

  const updateNewRow = useCallback(
    (id, field, value) => {
      setNewRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };

          // When unit is selected, auto-fill unitName and previousUnit from latest reading
          if (field === "unitId" && value) {
            const selectedUnit = Array.isArray(units)
              ? units.find((u) => u._id === value)
              : null;
            if (selectedUnit) {
              updated.unitName = selectedUnit.name;
              updated.unitId = value;
              const unitRecords = (readings || [])
                .filter((record) => {
                  const recordUnitId =
                    record.unit?._id ?? record.unit ?? null;
                  return recordUnitId === value;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.createdAt || a.nepaliDate || 0);
                  const dateB = new Date(b.createdAt || b.nepaliDate || 0);
                  return dateB - dateA;
                });
              if (unitRecords.length > 0) {
                const mostRecent = unitRecords[0];
                // Use currentReading from latest record as previousUnit for new row
                updated.previousUnit =
                  String(
                    mostRecent.currentReading ??
                      mostRecent.previousReading ??
                      ""
                  ) || "";
              }
            }
          }

          // Auto-calculate consumption when previous or current unit changes
          if (field === "previousUnit" || field === "currentUnit") {
            const prev =
              field === "previousUnit"
                ? parseFloat(value) || 0
                : parseFloat(updated.previousUnit) || 0;
            const curr =
              field === "currentUnit"
                ? parseFloat(value) || 0
                : parseFloat(updated.currentUnit) || 0;
            updated.consumption = (curr - prev).toFixed(1);
          }
          return updated;
        })
      );
    },
    [readings, units]
  );

  const removeNewRow = useCallback((id) => {
    setNewRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const clearNewRows = useCallback(() => {
    setNewRows([]);
  }, []);

  return { newRows, addNewRow, updateNewRow, removeNewRow, clearNewRows };
}
