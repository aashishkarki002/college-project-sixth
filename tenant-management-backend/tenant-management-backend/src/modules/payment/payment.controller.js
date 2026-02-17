import {
  createPayment,
  sendPaymentReceiptEmail,
  logPaymentActivity,
  getPaymentActivities,
} from "./payment.service.js";
import { Rent } from "../rents/rent.Model.js";
import { Payment } from "./payment.model.js";
import { getFilteredPaymentHistoryService } from "./payment.service.js";
import parsePaginationParams from "../../helper/paginator.js";
import { getDashboardStatsData } from "../dashboards/dashboard.service.js";
export async function payRentAndCam(req, res) {
  try {
    const {
      rentId,
      camId,
      tenantId,
      amount,
      paymentDate,
      nepaliDate,
      paymentMethod,
      paymentStatus,
      note,
      receivedBy,
      bankAccountId: bodyBankAccountId,
      bankAccount: bodyBankAccount,
      transactionRef,
      allocations, // New format: supports both rent and CAM
    } = req.body;

    // Support both bankAccountId and bankAccount so bank balance is updated when either is sent
    const bankAccountId = bodyBankAccountId || bodyBankAccount;

    // Build allocations object - support both old format (backward compatible) and new format
    let paymentAllocations = allocations;

    // If allocations not provided, build from old format (backward compatibility)
    if (!paymentAllocations) {
      paymentAllocations = {};

      if (rentId && amount) {
        paymentAllocations.rent = {
          rentId,
          amount: amount,
        };
      }

      if (camId && amount) {
        paymentAllocations.cam = {
          camId,
          paidAmount: amount,
        };
      }
    }

    const paymentData = {
      adminId: req.admin.id,
      tenantId,
      amount,
      paymentDate,
      nepaliDate,
      paymentMethod,
      paymentStatus: paymentStatus || "paid",
      note: note || "",
      receivedBy,
      bankAccountId, // Used to update bank balance for bank_transfer/cheque
      transactionRef: transactionRef || undefined,
      allocations: paymentAllocations,
    };
    const result = await createPayment(paymentData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to record payment",
      });
    }

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to record payment",
    });
  }
}

export async function getRentSummary(req, res) {
  try {
    const summary = await Rent.aggregate([
      {
        $group: {
          _id: null,
          // ✅ Use paisa fields for aggregation (precise integer arithmetic)
          totalCollectedPaisa: { $sum: "$paidAmountPaisa" },
          totalDuePaisa: { $sum: "$rentAmountPaisa" },
          totalPendingPaisa: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$rentAmountPaisa", 0],
            },
          },
        },
      },
    ]);

    const summaryData = summary[0] || {
      totalCollectedPaisa: 0,
      totalDuePaisa: 0,
      totalPendingPaisa: 0,
    };

    // Convert to rupees for response (backward compatibility)
    const data = {
      totalCollectedPaisa: summaryData.totalCollectedPaisa,
      totalDuePaisa: summaryData.totalDuePaisa,
      totalPendingPaisa: summaryData.totalPendingPaisa,
      totalCollected: summaryData.totalCollectedPaisa / 100,
      totalDue: summaryData.totalDuePaisa / 100,
      totalPending: summaryData.totalPendingPaisa / 100,
    };

    res.json({
      success: true,
      message: "Rent summary fetched successfully",
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to fetch rent summary",
    });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const result = await getDashboardStatsData();
    res.json(result);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch dashboard stats",
    });
  }
}

export async function sendReceiptEmail(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result = await sendPaymentReceiptEmail(paymentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || "Payment receipt email sent",
        data: { emailSentTo: result.emailSentTo },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Failed to send payment receipt email",
        error: result.error,
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send payment receipt email",
      error: err.message,
    });
  }
}
export async function getAllPaymentHistory(req, res) {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const [payments, total] = await Promise.all([
      Payment.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "tenant", select: "name" })
        .populate({
          path: "rent",
          populate: [
            { path: "tenant", select: "name" },
            { path: "property", select: "name" },
          ],
        })
        .populate({
          path: "bankAccount",
          select: "accountNumber accountName bankName",
        }),

      Payment.countDocuments(),
    ]);

    res.json({
      success: true,
      message: "Payment history fetched successfully",
      data: payments,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getting all payment history:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get payment history",
    });
  }
}
export async function getPaymentHistoryByTenant(req, res) {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const { page, limit, skip } = parsePaginationParams(req);

    const [payments, total] = await Promise.all([
      Payment.find({ tenant: tenantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "tenant",
          select: "name",
        })
        .populate({
          path: "rent",
          populate: [
            { path: "tenant", select: "name" },
            { path: "property", select: "name" },
          ],
        })
        .populate({
          path: "bankAccount",
          select: "accountNumber accountName bankName",
        }),
      Payment.countDocuments({ tenant: tenantId }),
    ]);

    res.json({
      success: true,
      message: "Tenant payment history fetched successfully",
      data: payments,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getting payment history by tenant:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get tenant payment history",
    });
  }
}
export async function getFilteredPaymentHistory(req, res) {
  try {
    const { tenantId, startDate, endDate, paymentMethod } = req.query;

    const result = await getFilteredPaymentHistoryService(
      tenantId,
      startDate,
      endDate,
      paymentMethod,
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Filtered payment history fetched successfully",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to fetch filtered payment history",
      });
    }
  } catch (err) {
    console.error("Error getting filtered payment history:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get filtered payment history",
    });
  }
}
export async function getPaymentById(req, res) {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }
    const payment = await Payment.findById(paymentId)
      .populate("tenant", "name")
      .populate("createdBy", "name")
      .populate({
        path: "rent",
        populate: [
          { path: "tenant", select: "name" },
          { path: "property", select: "name" },
        ],
      })
      .populate({
        path: "bankAccount",
        select: "accountNumber accountName bankName",
      });
    res.json({
      success: true,
      message: "Payment fetched successfully",
      data: payment,
    });
  } catch (err) {
    console.error("Error getting payment by id:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get payment by id",
    });
  }
}
export async function getPaymentByRentId(req, res) {
  try {
    const { rentId } = req.params;
    if (!rentId) {
      return res.status(400).json({
        success: false,
        message: "Rent ID is required",
      });
    }
    const payments = await Payment.find({ rent: rentId })
      .populate("tenant", "name")
      .populate({
        path: "rent",
        populate: [
          { path: "tenant", select: "name" },
          { path: "property", select: "name" },
        ],
      })
      .populate({
        path: "bankAccount",
        select: "accountNumber accountName bankName",
      });
    res.json({
      success: true,
      message: "Payments for rent fetched successfully",
      data: payments,
    });
  } catch (err) {
    console.error("Error getting payment by rent id:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get payments by rent id",
    });
  }
}

export async function logActivity(req, res) {
  try {
    const { paymentId } = req.params;
    const { activityType, metadata } = req.body;
    const adminId = req.admin?.id || null;

    if (!paymentId || !activityType) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and activity type are required",
      });
    }

    // Verify payment exists
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const result = await logPaymentActivity(
      paymentId,
      activityType,
      adminId,
      metadata || {},
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Activity logged successfully",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to log activity",
      });
    }
  } catch (err) {
    console.error("Error logging payment activity:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to log payment activity",
    });
  }
}

export async function getActivities(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result = await getPaymentActivities(paymentId);

    if (result.success) {
      res.json({
        success: true,
        message: "Payment activities fetched successfully",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to fetch payment activities",
      });
    }
  } catch (err) {
    console.error("Error getting payment activities:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get payment activities",
    });
  }
}
