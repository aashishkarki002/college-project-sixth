import { Router } from "express";
import {
  payRentAndCam,
  getRentSummary,
  sendReceiptEmail,
  getDashboardStats,
  getAllPaymentHistory,
  getPaymentHistoryByTenant,
  getPaymentByRentId,
  getFilteredPaymentHistory,
  getPaymentById,
  logActivity,
  getActivities,
} from "./payment.controller.js";
import { protect } from "../../middleware/protect.js";
const router = Router();

router.post("/pay-rent-and-cam", protect, payRentAndCam);
router.get("/get-rent-summary", protect, getRentSummary);
router.get("/dashboard-stats", protect, getDashboardStats);
router.post("/send-receipt/:paymentId", protect, sendReceiptEmail);
router.get("/get-all-payment-history", protect, getAllPaymentHistory);
router.get(
  "/get-payment-history-by-tenant/:tenantId",
  protect,
  getPaymentHistoryByTenant
);
router.get("/get-filtered-payment-history", protect, getFilteredPaymentHistory);
router.get("/get-payment-by-id/:paymentId", protect, getPaymentById);
router.get("/get-payment-by-rent-id/:rentId", protect, getPaymentByRentId);
router.post("/log-activity/:paymentId", protect, logActivity);
router.get("/get-activities/:paymentId", protect, getActivities);
export default router;
