import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ElectricityTabs } from "./ElectricityTabs";
import { NewReadingRow } from "./NewReadingRow";
import { ElectricityTableRow } from "./ElectricityTableRow";
import { ElectricityPagination } from "./ElectricityPagination";
import { isFlagged } from "../utils/electricityCalculations";
import { PAGE_SIZE } from "../utils/electricityConstants";

/**
 * Wrapper table: tabs, thead, new rows, paginated existing rows, pagination.
 */
export function ElectricityTable({
  loading,
  readings = [],
  newRows = [],
  units = [],
  activeTab,
  onTabChange,
  currentPage,
  onPageChange,
  onUpdateNewRow,
  onRemoveNewRow,
  onPaymentRecorded,
}) {
  const filteredData = React.useMemo(() => {
    if (activeTab === "flagged") {
      return readings.filter((record) => isFlagged(record));
    }
    return readings;
  }, [readings, activeTab]);

  const flaggedCount = React.useMemo(
    () => readings.filter((record) => isFlagged(record)).length,
    [readings]
  );

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  return (
    <Card className="rounded-lg shadow-lg mt-4 bg-white">
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-4">Unit Breakdown</h3>

          <ElectricityTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            flaggedCount={flaggedCount}
          />

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : readings.length === 0 && newRows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No electricity data available
              </div>
            ) : (
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
                    {newRows.map((newRow) => (
                      <NewReadingRow
                        key={newRow.id}
                        row={newRow}
                        units={units}
                        onUpdate={onUpdateNewRow}
                        onRemove={onRemoveNewRow}
                      />
                    ))}
                    {paginatedData.map((record, index) => (
                      <ElectricityTableRow
                        key={record._id ?? index}
                        record={record}
                        index={(currentPage - 1) * PAGE_SIZE + index}
                        onPaymentRecorded={onPaymentRecorded}
                      />
                    ))}
                  </tbody>
                </table>

                {filteredData.length > 0 && (
                  <ElectricityPagination
                    currentPage={currentPage}
                    totalItems={filteredData.length}
                    onPageChange={onPageChange}
                    pageSize={PAGE_SIZE}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
