import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenanceStatus,
  updateMaintenanceAssignedTo,
  getMaintenanceByTenantId,
} from "./maintenance.service.js";

export async function createMaintenanceController(req, res) {
  try {
    const adminId = req.admin.id;

    const maintenanceData = {
      ...req.body,
      createdBy: adminId,
    };

    const result = await createMaintenance(maintenanceData);

    return res.status(201).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAllMaintenanceController(req, res) {
  try {
    const result = await getAllMaintenance();
    return res.status(200).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMaintenanceByIdController(req, res) {
  try {
    const { id } = req.params;
    const result = await getMaintenanceById(id);

    const statusCode = result.success ? 200 : 404;
    return res.status(statusCode).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function updateMaintenanceStatusController(req, res) {
  try {
    const { id } = req.params;

    const adminId = req.admin.id;

    const {
      paymentStatus,
      paidAmount,
      lastPaidBy,
      status,
      nepaliDate,
      nepaliMonth,
      nepaliYear,
    } = req.body;

    const validStatuses = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    const result = await updateMaintenanceStatus(
      id,
      status,
      paymentStatus,
      paidAmount,
      lastPaidBy,
      {
        adminId,
        nepaliDate,
        nepaliMonth,
        nepaliYear,
      }
    );

    const statusCode = result.success ? 200 : 404;
    return res.status(statusCode).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
      expense: result.expense || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function updateMaintenanceAssignedToController(req, res) {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const result = await updateMaintenanceAssignedTo(id, assignedTo || null);
    const statusCode = result.success ? 200 : 404;
    return res.status(statusCode).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMaintenanceByTenantIdController(req, res) {
  try {
    const tenantId = req.params.id; // route: get-maintenance/:id
    const result = await getMaintenanceByTenantId(tenantId);
    return res.status(200).json({
      success: result.success,
      message: result.message,
      maintenance: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
