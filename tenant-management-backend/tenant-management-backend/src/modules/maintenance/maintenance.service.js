import { Maintenance } from "./Maintenance.Model.js";
import { Expense } from "../expenses/Expense.Model.js";
import ExpenseSource from "../expenses/ExpenseSource.Model.js";
import { createExpense } from "../expenses/expense.service.js";
import { ACCOUNTING_CONFIG } from "../../config/accounting.config.js";
import { rupeesToPaisa } from "../../utils/moneyUtil.js";
import { sendMaintenanceAssignmentEmail } from "../../config/nodemailer.js";

// ─── Helper ──────────────────────────────────────────────────────────────────
/**
 * Fires a non-blocking assignment email to the assigned staff.
 * Relies on populated `assignedTo`, `property`, and `unit` fields.
 */
function _notifyAssignedStaff(maintenance) {
  const staff = maintenance.assignedTo;
  if (!staff?.email) return; // nothing to do if no staff or no email

  sendMaintenanceAssignmentEmail({
    to: staff.email,
    staffName: staff.name,
    title: maintenance.title,
    description: maintenance.description,
    type: maintenance.type,
    priority: maintenance.priority,
    scheduledDate: maintenance.scheduledDate,
    propertyName: maintenance.property?.name,
    unitName: maintenance.unit?.name,
    maintenanceId: maintenance._id.toString(),
  });
  // Intentionally NOT awaited — email is a side-effect
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createMaintenance(maintenanceData) {
  try {
    if (
      maintenanceData.amountPaisa === undefined &&
      maintenanceData.amount !== undefined
    ) {
      maintenanceData.amountPaisa = rupeesToPaisa(maintenanceData.amount);
    }
    if (
      maintenanceData.paidAmountPaisa === undefined &&
      maintenanceData.paidAmount !== undefined
    ) {
      maintenanceData.paidAmountPaisa = rupeesToPaisa(
        maintenanceData.paidAmount,
      );
    }

    const maintenance = await Maintenance.create(maintenanceData);

    // Notify assigned staff if one was set at creation time
    if (maintenanceData.assignedTo) {
      const populated = await Maintenance.findById(maintenance._id)
        .populate("assignedTo", "name email")
        .populate("property", "name")
        .populate("unit", "name");

      _notifyAssignedStaff(populated);
    }

    return {
      success: true,
      message: "Maintenance task created successfully",
      data: maintenance,
    };
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      throw new Error(validationErrors);
    }
    throw new Error(error.message || "Failed to create maintenance task");
  }
}

export async function getAllMaintenance() {
  try {
    const maintenanceTasks = await Maintenance.find()
      .populate("tenant")
      .populate("unit")
      .populate("property")
      .populate("block")
      .populate("createdBy")
      .populate("assignedTo", "name email phone");

    return {
      success: true,
      message: "Maintenance tasks fetched successfully",
      data: maintenanceTasks,
    };
  } catch (error) {
    throw new Error(error.message || "Failed to get maintenance tasks");
  }
}

export async function getMaintenanceById(id) {
  try {
    const maintenance = await Maintenance.findById(id)
      .populate("tenant")
      .populate("unit")
      .populate("property")
      .populate("block")
      .populate("createdBy")
      .populate("assignedTo", "name email phone");

    if (!maintenance) {
      return {
        success: false,
        message: "Maintenance task not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Maintenance task fetched successfully",
      data: maintenance,
    };
  } catch (error) {
    throw new Error(error.message || "Failed to get maintenance task");
  }
}

export async function updateMaintenanceStatus(
  id,
  status,
  paymentStatus,
  paidAmountPaisa = null,
  paidAmount = null,
  lastPaidBy = null,
  options = {},
) {
  const existing = await Maintenance.findById(id);
  if (!existing) {
    return {
      success: false,
      message: "Maintenance task not found",
      data: null,
      expense: null,
    };
  }

  const finalPaidAmountPaisa =
    paidAmountPaisa !== undefined
      ? paidAmountPaisa
      : paidAmount !== null
        ? rupeesToPaisa(paidAmount)
        : null;

  const updateFields = { status, paymentStatus };
  if (finalPaidAmountPaisa !== null) {
    updateFields.paidAmountPaisa = finalPaidAmountPaisa;
    updateFields.paidAmount = finalPaidAmountPaisa / 100;
  }
  if (lastPaidBy) updateFields.lastPaidBy = lastPaidBy;

  const updatedTask = await Maintenance.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true },
  );

  let expense = null;
  const isCompleted = updatedTask?.status === "COMPLETED";
  const isPaid = updatedTask?.paymentStatus === "paid";

  if (isCompleted && isPaid) {
    const finalPaidAmountPaisa =
      updatedTask.paidAmountPaisa ||
      (updatedTask.paidAmount ? rupeesToPaisa(updatedTask.paidAmount) : 0);

    if (finalPaidAmountPaisa > 0) {
      const existingExpense = await Expense.findOne({
        referenceType: "MAINTENANCE",
        referenceId: updatedTask._id,
      });

      if (existingExpense) {
        expense = existingExpense;
      } else {
        const maintenanceSource = await ExpenseSource.findOne({
          code: ACCOUNTING_CONFIG.MAINTENANCE_EXPENSE_SOURCE_CODE,
        });

        if (!maintenanceSource) {
          throw new Error(
            "Maintenance ExpenseSource with code MAINTENANCE not found",
          );
        }

        const { adminId, nepaliDate, nepaliMonth, nepaliYear } = options;
        const now = new Date();
        const payeeType = updatedTask.tenant ? "TENANT" : "EXTERNAL";

        const expenseData = {
          source: maintenanceSource._id,
          amountPaisa: finalPaidAmountPaisa,
          amount: finalPaidAmountPaisa / 100,
          EnglishDate: now,
          nepaliDate: nepaliDate ? new Date(nepaliDate) : now,
          nepaliMonth:
            typeof nepaliMonth === "number" ? nepaliMonth : now.getMonth() + 1,
          nepaliYear:
            typeof nepaliYear === "number" ? nepaliYear : now.getFullYear(),
          payeeType,
          ...(payeeType === "TENANT" ? { tenant: updatedTask.tenant } : {}),
          referenceType: "MAINTENANCE",
          referenceId: updatedTask._id,
          status: "RECORDED",
          notes:
            updatedTask.completionNotes ||
            "Auto-created from maintenance completion",
          createdBy: adminId || updatedTask.createdBy,
          expenseCode: ACCOUNTING_CONFIG.MAINTENANCE_EXPENSE_CODE,
        };

        const result = await createExpense(expenseData);
        console.log("create expense result", result);
        if (!result.success) {
          throw new Error(
            result.error || result.message || "Failed to create expense",
          );
        }

        expense = result.data;
      }
    }
  }

  return {
    success: true,
    message: "Maintenance status updated successfully",
    data: updatedTask,
    expense,
  };
}

export async function updateMaintenanceAssignedTo(id, assignedTo) {
  const existing = await Maintenance.findById(id);
  if (!existing) {
    return {
      success: false,
      message: "Maintenance task not found",
      data: null,
    };
  }

  const updated = await Maintenance.findByIdAndUpdate(
    id,
    { $set: { assignedTo: assignedTo || null } },
    { new: true },
  )
    .populate("assignedTo", "name email phone")
    .populate("tenant")
    .populate("unit", "name")
    .populate("property", "name")
    .populate("block")
    .populate("createdBy");

  // Notify newly assigned staff
  if (assignedTo) {
    _notifyAssignedStaff(updated);
  }

  return {
    success: true,
    message: "Assignment updated successfully",
    data: updated,
  };
}

export async function getMaintenanceByTenantId(tenantId) {
  const maintenance = await Maintenance.find({ tenant: tenantId })
    .populate("tenant")
    .populate("unit")
    .populate("property")
    .populate("block")
    .populate("createdBy");
  return {
    success: true,
    message: "Maintenance tasks fetched successfully",
    data: maintenance,
  };
}
