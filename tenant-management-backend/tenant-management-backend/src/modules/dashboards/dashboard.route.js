import { Router } from "express";
import { getDashboardStats } from "./dashboard.service.js";
import { protect } from "../../middleware/protect.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();

router.get(
  "/stats",
  protect,
  authorize("admin", "super_admin", "staff"),
  getDashboardStats,
);

export default router;
