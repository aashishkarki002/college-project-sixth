import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Single editable inline row for adding a new reading.
 * Consumption is derived from previous/current (handled by parent hook).
 */
export function NewReadingRow({
  row,
  units = [],
  onUpdate,
  onRemove,
}) {
  const { id, unitId, previousUnit, currentUnit, consumption, status } = row;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50">
      <td className="py-3 px-4">
        <Select
          value={unitId || ""}
          onValueChange={(value) => onUpdate(id, "unitId", value)}
        >
          <SelectTrigger className="w-full h-9 bg-white border border-gray-300 text-sm">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {Array.isArray(units) && units.length > 0 ? (
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
          value={previousUnit ?? ""}
          onChange={(e) => onUpdate(id, "previousUnit", e.target.value)}
          placeholder="0.0"
          className="w-full px-3 py-2 h-9 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          step="0.1"
          value={currentUnit ?? ""}
          onChange={(e) => onUpdate(id, "currentUnit", e.target.value)}
          placeholder="0.0"
          className="w-full px-3 py-2 h-9 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </td>
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-blue-600">
          {consumption || "0.0"} kWh
        </span>
      </td>
      <td className="py-3 px-4">
        <Select
          value={status || "pending"}
          onValueChange={(value) => onUpdate(id, "status", value)}
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
          onClick={() => onRemove(id)}
          className="h-8 text-xs"
        >
          Remove
        </Button>
      </td>
    </tr>
  );
}
