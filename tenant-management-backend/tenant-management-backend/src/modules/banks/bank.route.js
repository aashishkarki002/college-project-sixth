import { Router } from "express";
import {
  createBankAccount,
  getBankAccounts,
  deleteBankAccount,
} from "./bank.controller.js";
import { protect } from "../../middleware/protect.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();
router.post(
  "/create-bank-account",
  protect,
  authorize("admin", "super_admin"),
  createBankAccount,
);
router.get(
  "/get-bank-accounts",
  protect,
  authorize("admin", "super_admin", "staff"),
  getBankAccounts,
);
router.patch(
  "/delete-bank-account/:id",
  protect,
  authorize("admin", "super_admin"),
  deleteBankAccount,
);
export default router;
