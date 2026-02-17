import {
  createExpense,
  getAllExpenses,
  getExpenseSources,
} from "./expense.service.js";
export async function createExpenseController(req, res) {
  try {
    const adminId = req.admin.id;
    // Handle both array and object request bodies
    const bodyData = Array.isArray(req.body) ? req.body[0] : req.body;

    const { createdBy, ...restBodyData } = bodyData;

    const expenseData = {
      ...restBodyData,
      createdBy: adminId,
    };

    const result = await createExpense(expenseData);

    if (!result.success) {
      return res.status(400).json({
        success: result.success,
        message: result.message,
        error: result.error,
      });
    }

    res.status(201).json({
      success: result.success,
      message: result.message,
      expense: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAllExpensesController(req, res) {
  try {
    const result = await getAllExpenses();
    res.status(200).json({
      success: result.success,
      message: result.message,
      expenses: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getExpenseSourcesController(req, res) {
  try {
    const result = await getExpenseSources();
    res.status(200).json({
      success: result.success,
      message: result.message,
      expenseSources: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
