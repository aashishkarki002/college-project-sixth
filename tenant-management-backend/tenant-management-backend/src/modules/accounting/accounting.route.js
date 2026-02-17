import { Router } from "express";
import { getAccountingSummaryController } from "./accounting.controller.js";
import { protect } from "../../middleware/protect.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();

// Dashboard summary for Accounting.jsx
router.get(
  "/summary",
  protect,
  authorize("admin", "super_admin", "staff"),
  getAccountingSummaryController,
);

export default router;
