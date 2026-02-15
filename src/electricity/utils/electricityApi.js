/**
 * Electricity API: get readings (with filters) and create reading.
 */

import api from "../../../plugins/axios";

/**
 * GET /api/electricity/get-readings
 * @param {Object} params - Query: propertyId, unitId, tenantId, nepaliYear, nepaliMonth, status, startDate, endDate
 * @returns {Promise<{ readings: Array, summary: Object }>}
 */
export async function getReadings(params = {}) {
  const response = await api.get("/api/electricity/get-readings", {
    params: {
      ...params,
      nepaliYear:
        params.nepaliYear != null ? String(params.nepaliYear) : undefined,
      nepaliMonth:
        params.nepaliMonth != null ? String(params.nepaliMonth) : undefined,
    },
  });
  const result = response.data;
  if (!result?.success || !result?.data) {
    throw new Error(result?.message || "Failed to fetch readings");
  }
  return result.data;
}

/**
 * POST /api/electricity/create-reading
 * @param {Object} body - tenantId, unitId, currentReading, ratePerUnit, nepaliMonth, nepaliYear, nepaliDate, englishMonth, englishYear, readingDate?, previousReading?, notes?
 * @returns {Promise<Object>} Created electricity document
 */
export async function createReading(body) {
  const response = await api.post("/api/electricity/create-reading", body);
  const result = response.data;
  if (!result?.success) {
    throw new Error(result?.message || "Failed to create reading");
  }
  return result.data;
}

/**
 * POST /api/electricity/record-payment
 * @param {Object} body - electricityId, amount, paymentDate?, nepaliDate?
 * @param {File} [receiptFile] - Optional receipt image/file (sends as multipart with field "receiptImage")
 * @returns {Promise<Object>}
 */
export async function recordPayment(body, receiptFile = null) {
  let response;
  if (receiptFile) {
    const formData = new FormData();
    formData.append("electricityId", body.electricityId);
    formData.append("amount", String(body.amount));
    if (body.paymentDate) formData.append("paymentDate", body.paymentDate);
    if (body.nepaliDate) formData.append("nepaliDate", body.nepaliDate);
    formData.append("receiptImage", receiptFile);
    response = await api.post("/api/electricity/record-payment", formData);
  } else {
    response = await api.post("/api/electricity/record-payment", body);
  }
  const result = response.data;
  if (!result?.success) {
    throw new Error(result?.message || "Failed to record payment");
  }
  return result;
}

/**
 * PUT /api/electricity/update-reading/:id
 * @param {string} id - Electricity reading id
 * @param {Object} body - currentReading?, ratePerUnit?, notes?, status?
 * @returns {Promise<Object>}
 */
export async function updateReading(id, body) {
  const response = await api.put(`/api/electricity/update-reading/${id}`, body);
  const result = response.data;
  if (!result?.success) {
    throw new Error(result?.message || "Failed to update reading");
  }
  return result;
}
