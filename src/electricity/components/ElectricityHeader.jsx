import React from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Save } from "lucide-react";

/**
 * Title and action buttons for the electricity screen.
 */
export function ElectricityHeader({
  onExportReport,
  onAddReading,
  onSaveReadings,
  hasNewRows = false,
  saving = false,
}) {
  return (
    <div className="flex justify-between">
      <div>
        <p className="text-2xl font-bold">Utility Monitoring</p>
        <p className="text-gray-500 text-sm">
          Detailed electricity consumption tracking for buildings
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          className="bg-gray-100 text-black hover:bg-gray-200"
          onClick={onExportReport}
        >
          <PlusIcon className="w-5 h-5" />
          Export Report
        </Button>
        {hasNewRows && (
          <Button
            type="button"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={onSaveReadings}
            disabled={saving}
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving…" : "Save readings"}
          </Button>
        )}
        <Button
          type="button"
          className="bg-blue-500 text-white hover:bg-blue-600"
          onClick={onAddReading}
        >
          <PlusIcon className="w-5 h-5" />
          Add Reading
        </Button>
      </div>
    </div>
  );
}
