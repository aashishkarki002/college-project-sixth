import { Expense } from "./Expense.Model.js";
import ExpenseSource from "./ExpenseSource.Model.js";
import Admin from "../auth/admin.Model.js";
import mongoose from "mongoose";
import { ledgerService } from "../ledger/ledger.service.js";
import { buildExpenseJournal } from "../ledger/journal-builders/index.js";
import { rupeesToPaisa } from "../../utils/moneyUtil.js";
import { ACCOUNTING_CONFIG } from "../../config/accounting.config.js";

export async function createExpense(expenseData) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      source,
      amountPaisa,
      amount,
      EnglishDate,
      nepaliDate,
      nepaliMonth,
      nepaliYear,
      payeeType,
      tenant,
      referenceType,
      referenceId,
      status,
      notes,
      createdBy,
      expenseCode,
    } = expenseData;

    // ✅ Convert to paisa if needed
    const finalAmountPaisa =
      amountPaisa !== undefined
        ? amountPaisa
        : amount
          ? rupeesToPaisa(amount)
          : 0;

    const expenseSource = await ExpenseSource.findById(source).session(session);
    if (!expenseSource) {
      throw new Error("Expense source not found");
    }
    const existingAdmin = await Admin.findById(createdBy).session(session);
    if (!existingAdmin) {
      throw new Error("Admin not found");
    }

    // Determine which ledger expense account code to use.
    // Priority:
    // 1. Explicit expenseCode from the caller
    // 2. Special mapping for known ExpenseSource codes (e.g. MAINTENANCE)
    // 3. Fallback to a generic expense account code (5200)
    let expenseCodeToUse = expenseCode;
    if (!expenseCodeToUse && expenseSource?.code) {
      if (expenseSource.code === ACCOUNTING_CONFIG.MAINTENANCE_EXPENSE_SOURCE_CODE) {
        expenseCodeToUse = ACCOUNTING_CONFIG.MAINTENANCE_EXPENSE_CODE;
      } else {
        expenseCodeToUse = expenseSource.code;
      }
    }
    if (!expenseCodeToUse) {
      expenseCodeToUse = "5200";
    }
    // Create expense first so we have an _id for the transaction referenceId
    const [expense] = await Expense.create(
      [
        {
          source: expenseSource._id,
          amountPaisa: finalAmountPaisa,
          EnglishDate,
          nepaliDate,
          nepaliMonth,
          nepaliYear,
          payeeType,
          tenant,
          referenceType,
          referenceId,
          status,
          notes,
          createdBy,
          expenseCode: expenseCodeToUse,
        },
      ],
      { session },
    );
    // Record expense in ledger after creation so expense._id exists
    const expensePayload = buildExpenseJournal(expense);
    await ledgerService.postJournalEntry(expensePayload, session);
    await session.commitTransaction();
    session.endSession();
    return {
      success: true,
      message: "Expense created successfully",
      data: expense,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return {
        success: false,
        message: "Validation error",
        error: validationErrors,
      };
    }

    return {
      success: false,
      message: "Failed to create expense",
      error: error.message,
    };
  }
}

async function getAllExpenses() {
  try {
    const expenses = await Expense.find()
      .populate("source")
      .sort({ EnglishDate: -1 });
    return {
      success: true,
      message: "Expenses fetched successfully",
      data: expenses,
    };
  } catch (error) {
    console.error("Failed to get expenses:", error);
    throw error;
  }
}

async function getExpenseSources() {
  try {
    const expenseSource = await ExpenseSource.find({ isActive: true });
    return {
      success: true,
      message: "Expense sources fetched successfully",
      data: expenseSource,
    };
  } catch (error) {
    console.error("Failed to get expense sources:", error);
    throw error;
  }
}

export { getAllExpenses, getExpenseSources };
