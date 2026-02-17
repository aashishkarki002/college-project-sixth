import { Router } from "express";
import {
  createExpenseController,
  getAllExpensesController,
  getExpenseSourcesController,
} from "./expense.controller.js";
import { protect } from "../../middleware/protect.js";
const router = Router();
router.post("/create", protect, createExpenseController);
router.get("/get-all", protect, getAllExpensesController);
router.get("/get-expense-sources", protect, getExpenseSourcesController);
export default router;
