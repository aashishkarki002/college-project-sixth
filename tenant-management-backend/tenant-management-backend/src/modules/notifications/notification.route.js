import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.controller.js";
import { protect } from "../../middleware/protect.js";
const router = Router();

router.get("/get-notifications", protect, getNotifications);
router.patch(
  "/mark-all-notifications-as-read",
  protect,
  markAllNotificationsAsRead
);
router.patch("/mark-notification-as-read/:id", protect, markNotificationAsRead);
export default router;
