import { Router } from "express";
import {
  getStaffsController,
  updateStaffController,
  deleteStaffController,
} from "./staffs.controller.js";
import { protect } from "../../middleware/protect.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();

router.get(
  "/get-staffs",
  protect,
  authorize("admin", "super_admin", "staff"),
  getStaffsController
);

router.patch(
  "/update-staff/:id",
  protect,
  authorize("super_admin"),
  updateStaffController
);
router.delete(
  "/delete-staff/:id",
  protect,
  authorize("super_admin"),
  deleteStaffController
);
export default router;
