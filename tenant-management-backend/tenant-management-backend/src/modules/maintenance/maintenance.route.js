import { Router } from "express";
import { protect } from "../../middleware/protect.js";
import {
  createMaintenanceController,
  getAllMaintenanceController,
  getMaintenanceByIdController,
  updateMaintenanceStatusController,
  updateMaintenanceAssignedToController,
  getMaintenanceByTenantIdController,
} from "./maintenance.controller.js";

const router = Router();

// Create a new maintenance task
router.post("/create", protect, createMaintenanceController);

// Get all maintenance tasks
router.get("/all", protect, getAllMaintenanceController);

// Get a single maintenance task by id
router.get("/:id", protect, getMaintenanceByIdController);

// Update maintenance status (OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
router.patch("/:id/status", protect, updateMaintenanceStatusController);

// Update assigned staff
router.patch("/:id/assign", protect, updateMaintenanceAssignedToController);
router.get("/get-maintenance/:id", protect, getMaintenanceByTenantIdController);
export default router;
