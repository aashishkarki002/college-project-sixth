import { getIO } from "../config/socket.js";
import Notification from "../modules/notifications/notification.model.js";
import dotenv from "dotenv";
import BankAccount from "../modules/banks/BankAccountModel.js";
import { formatMoney } from "./moneyUtil.js";
dotenv.config();

export const emitPaymentNotification = async (normalizedData, adminId) => {
  const io = getIO();
  // When called from API, adminId comes from req.admin.id; fallback to env when omitted (e.g. cron)
  const targetAdminId = adminId || process.env.SYSTEM_ADMIN_ID;
  try {
    const {
      paymentId,
      tenantId,
      amountPaisa,
      paymentDate,
      paymentMethod,
      paymentStatus,
      note,
      receivedBy,
      bankAccountId,
    } = normalizedData;

    let bankName = "Unknown";

    if (bankAccountId) {
      const bank = await BankAccount.findById(bankAccountId).select("name");
      if (bank?.name) {
        bankName = bank.name;
      }
    }

    const dateStr =
      paymentDate instanceof Date
        ? paymentDate.toLocaleDateString()
        : paymentDate
          ? new Date(paymentDate).toLocaleDateString()
          : "N/A";
    const amountStr = formatMoney(amountPaisa);
    const methodStr = paymentMethod || "N/A";

    const notificationMessage = `Payment of Rs. ${amountStr} received from tenant on ${dateStr} using ${methodStr}${
      bankAccountId ? ` (Bank Account: ${bankName})` : ""
    }`;

    const notification = await Notification.create({
      admin: targetAdminId,
      type: "PAYMENT_NOTIFICATION",
      title: "Payment Notification",
      message: notificationMessage,
      data: {
        paymentId,
        tenantId,
        amountPaisa,
        paymentDate,
        paymentMethod,
        paymentStatus,
        note,
        receivedBy,
        bankAccountId,
      },
    });

    io.to(`admin:${targetAdminId}`).emit("new-notification", {
      notification: {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: false,
        createdAt: notification.createdAt,
      },
    });
    return {
      success: true,
      message: "Payment notification emitted successfully",
    };
  } catch (error) {
    console.error("Error emitting payment notification:", error);
    return {
      success: false,
      message: "Failed to emit payment notification",
      error: error.message,
    };
  }
};
