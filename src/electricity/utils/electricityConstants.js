/**
 * Electricity screen constants: thresholds, defaults, page size.
 */

/** Consumption above this (kWh) is considered high usage / flagged */
export const FLAGGED_CONSUMPTION_THRESHOLD = 200;

/** Default status for new reading rows */
export const DEFAULT_NEW_ROW_STATUS = "pending";

/** Page size for table pagination */
export const PAGE_SIZE = 12;

/** Default rate per unit (Rs/kWh) when creating readings; backend requires it */
export const DEFAULT_RATE_PER_UNIT = 10;

/** Empty summary shape for initial/error state */
export const EMPTY_SUMMARY = {
  totalReadings: 0,
  totalConsumption: 0,
  totalAmount: 0,
  totalPaid: 0,
  totalPending: 0,
  averageConsumption: 0,
};
