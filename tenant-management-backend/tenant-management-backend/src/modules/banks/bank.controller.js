import BankAccount from "./BankAccountModel.js";

export const createBankAccount = async (req, res) => {
  try {
    const { accountNumber, accountName, bankName, balance } = req.body;
    const newBankAccount = await BankAccount.create({
      accountNumber,
      accountName,
      bankName,
      balance,
    });
    return res.status(201).json({
      success: true,
      message: "Bank account created successfully",
      bankAccount: newBankAccount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Bank account creation failed",
      error: error.message,
    });
  }
};
export const getBankAccounts = async (req, res) => {
  try {
    const bankAccounts = await BankAccount.find({ isDeleted: false });
    return res.status(200).json({ success: true, bankAccounts });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Bank accounts retrieval failed",
      error: error.message,
    });
  }
};
export const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const bankAccount = await BankAccount.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
    return res.status(200).json({ success: true, bankAccount });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bank account",
      error: error.message,
    });
  }
};
