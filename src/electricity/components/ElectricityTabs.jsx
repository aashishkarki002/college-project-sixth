import React from "react";

/**
 * All / Flagged tabs for unit breakdown table.
 */
export function ElectricityTabs({ activeTab, onTabChange, flaggedCount = 0 }) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        type="button"
        onClick={() => onTabChange("all")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "all"
            ? "bg-gray-200 text-black"
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        All Units
      </button>
      <button
        type="button"
        onClick={() => onTabChange("flagged")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "flagged"
            ? "bg-red-100 text-red-600"
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        Flagged ({flaggedCount})
      </button>
    </div>
  );
}
