import { Rent } from "../modules/rents/rent.Model.js";
import {
  getNepaliMonthDates,
  checkNepaliSpecialDays,
} from "./nepaliDateHelper.js";
import Notification from "../modules/notifications/Notification.Model.js";
import { getIO } from "../config/socket.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Sends rent reminder notifications
 * @param {boolean} manualTrigger - if true, ignores reminderDay check
 * @param {string} [adminId] - admin id from req.admin.id; when omitted (e.g. cron), uses SYSTEM_ADMIN_ID
 */
export const sendRentReminderNotification = async (
  manualTrigger = false,
  adminId = null
) => {
  try {
    const io = getIO();
    const targetAdminId = adminId || process.env.SYSTEM_ADMIN_ID;
    const { npMonth, npYear } = getNepaliMonthDates();
    const { reminderDay } = checkNepaliSpecialDays();

    // Only send automatically if reminderDay is true
    if (!manualTrigger && !reminderDay) {
      return { success: true, message: "Today is not a reminder day" };
    }

    // Find rents that are pending or partially paid
    const rents = await Rent.find({
      status: { $in: ["pending", "partially_paid"] },
      nepaliMonth: npMonth,
      nepaliYear: npYear,
    }).populate("tenant");

    if (!rents.length) {
      if (targetAdminId) {
        io.to(`admin:${targetAdminId}`).emit("new-notification", {
          notification: {
            type: "RENT_REMINDER",
            message: `No pending rents for ${npMonth}-${npYear}`,
            count: 0,
          },
        });
      } else {
        io.emit("notification", {
          type: "RENT_REMINDER",
          message: `No pending rents for ${npMonth}-${npYear}`,
          count: 0,
        });
      }
      return {
        success: true,
        message: "No pending rents found for this month",
      };
    }

    const message = manualTrigger
      ? `Manual trigger: ${rents.length} rents are due for this month.`
      : `Reminder day! ${rents.length} rents are due for this month.`;

    const notificationData = rents.map((r) => ({
      tenantName: r.tenant.name,
      rentAmount: r.rentAmount,
      dueDate: r.nepaliDueDate,
    }));

    // Save notification in DB — admin from req or env fallback
    const notification = await Notification.create({
      admin: targetAdminId,
      type: "RENT_REMINDER",
      title: "Rents Due Reminder",
      message,
      data: notificationData,
    });

    // Emit via Socket.io to the target admin (same shape as payment notifications)
    if (targetAdminId) {
      io.to(`admin:${targetAdminId}`).emit("new-notification", {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead ?? false,
          createdAt: notification.createdAt,
        },
      });
    } else {
      io.emit("notification", {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      });
    }

    return {
      success: true,
      message: `Notification sent for ${rents.length} rents.`,
    };
  } catch (error) {
    console.error("Error sending rent reminder notification:", error);
    return {
      success: false,
      message: "Failed to send notification",
      error: error.message,
    };
  }
};
