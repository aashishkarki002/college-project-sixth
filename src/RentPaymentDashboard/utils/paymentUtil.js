/**
 * Finds matching CAM for a given rent based on tenant and month/year
 * @param {Array} cams - Array of CAM objects
 * @param {Object} rent - Rent object
 * @returns {Object|null} Matching CAM object or null
 */
export const findMatchingCam = (cams, rent) => {
  if (!cams || !rent || !rent.tenant) return null;
  
  return cams.find(
    (cam) =>
      cam.tenant?._id === rent.tenant?._id &&
      cam.nepaliMonth === rent.nepaliMonth &&
      cam.nepaliYear === rent.nepaliYear
  );
};

/**
 * Calculates payment amounts (rent, CAM, total) for a given rent
 * Handles both paisa and rupee formats for backward compatibility
 * @param {Object} rent - Rent object (may have rentAmountPaisa or rentAmount)
 * @param {Array} cams - Array of CAM objects (may have amountPaisa or amount)
 * @returns {Object} Object with rentAmount, camAmount, and totalDue (in rupees for display)
 */
export const getPaymentAmounts = (rent, cams) => {
  const matchingCam = findMatchingCam(cams, rent);
  
  // ✅ Read from paisa fields if available, otherwise use rupee fields
  // Convert paisa to rupees for display (divide by 100)
  const rentAmountPaisa = rent.rentAmountPaisa || (rent.rentAmount ? rent.rentAmount * 100 : 0);
  const rentAmount = rentAmountPaisa / 100;
  
  const camAmountPaisa = matchingCam?.amountPaisa || 
    (matchingCam?.amount ? matchingCam.amount * 100 : 0) ||
    (rent.tenant?.camChargesPaisa || (rent.tenant?.camCharges ? rent.tenant.camCharges * 100 : 0));
  const camAmount = camAmountPaisa / 100;
  
  return { 
    rentAmount, 
    camAmount, 
    totalDue: rentAmount + camAmount,
    // Also return paisa values for calculations
    rentAmountPaisa,
    camAmountPaisa,
    totalDuePaisa: rentAmountPaisa + camAmountPaisa,
  };
};

/**
 * Normalizes status string to lowercase
 * @param {string} status - Status string
 * @returns {string} Lowercase status string
 */
export const normalizeStatus = (status = "") => status.toLowerCase();

/**
 * Formats payment date for display
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string or "N/A"
 */
export const formatPaymentDate = (date) => {
  if (!date) return "N/A";
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "N/A";
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "N/A";
  }
};

/**
 * Formats payment method for display
 * @param {string} method - Payment method string
 * @returns {string} Formatted payment method string
 */
export const formatPaymentMethod = (method) => {
  if (!method) return "N/A";
  return method === "bank_transfer"
    ? "Bank Transfer"
    : method === "cash"
      ? "Cash"
      : method.charAt(0).toUpperCase() + method.slice(1);
};

/**
 * Formats payment status for display
 * @param {string} status - Payment status string
 * @returns {string} Formatted status string
 */
export const formatPaymentStatus = (status) => {
  if (!status) return "N/A";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

