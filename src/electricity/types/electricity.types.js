/**
 * Electricity module type definitions (JSDoc for clarity; project uses JS).
 * Backend Electricity model: unit, previousReading, currentReading, consumption,
 * ratePerUnit, totalAmount, status, nepaliMonth/Year/Date, receipt, etc.
 */

/** @typedef {Object} ElectricitySummary
 * @property {number} totalReadings
 * @property {number} totalConsumption
 * @property {number} totalAmount
 * @property {number} totalPaid
 * @property {number} totalPending
 * @property {number} averageConsumption
 */

/** @typedef {Object} ElectricityReading
 * @property {string} _id
 * @property {{ _id: string, name?: string, unitName?: string } | string} unit
 * @property {number} [previousReading]
 * @property {number} [currentReading]
 * @property {number} [consumption]
 * @property {string} [status] - pending | paid | partially_paid | overdue
 * @property {{ url?: string } | null} [billMedia]
 * @property {string} [createdAt]
 * @property {string} [nepaliDate]
 */

/** @typedef {Object} ElectricityData
 * @property {ElectricityReading[]} readings
 * @property {ElectricitySummary} summary
 */

/** @typedef {Object} NewReadingRow
 * @property {number} id - temporary client id
 * @property {string} [unitId]
 * @property {string} [unitName]
 * @property {string} [previousUnit]
 * @property {string} [currentUnit]
 * @property {string} [consumption]
 * @property {string} status
 * @property {boolean} isNew
 */

export const ELECTRICITY_TYPES = {};
