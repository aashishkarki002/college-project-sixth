import { useState, useEffect, useMemo } from "react";
import api from "../../../plugins/axios";
import { toast } from "sonner";
import { getCurrentNepaliMonthYear } from "@/constants/nepaliMonths";

/**
 * Custom hook for managing rent and payment data
 * Handles fetching rents, payments, units, bank accounts, CAMs, and summary data
 */
export const useRentData = () => {
  const [rents, setRents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cams, setCams] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rent tab: filter by Nepali month/year (default current month)
  const { month: defaultMonth, year: defaultYear } =
    getCurrentNepaliMonthYear();
  const [filterRentMonth, setFilterRentMonth] = useState(defaultMonth);
  const [filterRentYear, setFilterRentYear] = useState(defaultYear);

  // Filter states (payments tab)
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");

  // Rents filtered by selected Nepali month/year
  const filteredRents = useMemo(
    () =>
      rents.filter(
        (r) =>
          Number(r.nepaliMonth) === filterRentMonth &&
          Number(r.nepaliYear) === filterRentYear,
      ),
    [rents, filterRentMonth, filterRentYear],
  );

  /**
   * Fetches all rents from the API
   */
  const getRents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/rent/get-rents");
      if (response.data.success) {
        setRents(response.data.rents || []);
      } else {
        throw new Error(response.data.message || "Failed to fetch rents");
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
      setError(error);
      toast.error("Failed to fetch rents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches payments with optional filters
   */
  const getPayments = async () => {
    try {
      setPaymentsLoading(true);
      setError(null);
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (filterStartDate) {
        params.append("startDate", filterStartDate);
      }
      if (filterEndDate) {
        params.append("endDate", filterEndDate);
      }
      if (filterPaymentMethod && filterPaymentMethod !== "all") {
        params.append("paymentMethod", filterPaymentMethod);
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/payment/get-filtered-payment-history?${queryString}`
        : "/api/payment/get-all-payment-history";

      const response = await api.get(endpoint);
      if (response.data.success) {
        setPayments(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Failed to fetch payments");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError(error);
      toast.error("Failed to fetch payments. Please try again.");
    } finally {
      setPaymentsLoading(false);
    }
  };

  /**
   * Fetches rent summary (total collected and total due)
   */
  const fetchRentSummary = async () => {
    try {
      const response = await api.get("/api/payment/get-rent-summary");
      if (response.data.success && response.data.data) {
        setTotalCollected(response.data.data.totalCollected || 0);
        setTotalDue(response.data.data.totalDue || 0);
      }
    } catch (error) {
      console.error("Error fetching rent summary:", error);
      toast.error("Failed to fetch rent summary");
    }
  };

  /**
   * Fetches bank accounts
   */
  const getBankAccounts = async () => {
    try {
      const response = await api.get("/api/bank/get-bank-accounts");
      const data = await response.data;
      setBankAccounts(data.bankAccounts || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Failed to fetch bank accounts");
    }
  };

  /**
   * Fetches units
   */
  const getUnits = async () => {
    try {
      const response = await api.get("/api/unit/get-units");
      setUnits(response.data.units || []);
    } catch (error) {
      console.error("Error fetching units:", error);
      toast.error("Failed to fetch units");
    }
  };

  /**
   * Fetches CAMs (required for CAM payment allocation).
   * Optional filters: nepaliMonth, nepaliYear.
   */
  const getCams = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.nepaliMonth != null)
        params.append("nepaliMonth", filters.nepaliMonth);
      if (filters.nepaliYear != null)
        params.append("nepaliYear", filters.nepaliYear);
      const qs = params.toString();
      const url = qs ? `/api/cam/get-cams?${qs}` : "/api/cam/get-cams";
      const response = await api.get(url);
      if (response.data.success) {
        setCams(response.data.cams || []);
      } else {
        throw new Error(response.data.message || "Failed to fetch CAMs");
      }
    } catch (error) {
      console.error("Error fetching CAMs:", error);
      setCams([]);
      toast.error("Failed to fetch CAMs. CAM payments may be unavailable.");
    }
  };

  /**
   * Initializes all data on mount
   */
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getRents(),
          getBankAccounts(),
          getUnits(),
          fetchRentSummary(),
        ]);
      } catch (error) {
        console.error("Init load failed:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Refetch CAMs when rent month/year filter changes
  useEffect(() => {
    getCams({ nepaliMonth: filterRentMonth, nepaliYear: filterRentYear });
  }, [filterRentMonth, filterRentYear]);

  // Refetch payments when filters change
  useEffect(() => {
    getPayments();
  }, [filterStartDate, filterEndDate, filterPaymentMethod]);

  return {
    // Data
    rents,
    filteredRents,
    payments,
    units,
    bankAccounts,
    cams,
    totalCollected,
    totalDue,
    // State
    loading,
    paymentsLoading,
    error,
    // Rent tab filters (Nepali month/year)
    filterRentMonth,
    filterRentYear,
    setFilterRentMonth,
    setFilterRentYear,
    // Payments tab filters
    filterStartDate,
    filterEndDate,
    filterPaymentMethod,
    setFilterStartDate,
    setFilterEndDate,
    setFilterPaymentMethod,
    // Actions
    getRents,
    getPayments,
    fetchRentSummary,
    getBankAccounts,
    getUnits,
    getCams,
  };
};
