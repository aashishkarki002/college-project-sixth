import BankAccount from "./BankAccountModel.js";

/**
 * Apply payment to bank account (using integer paisa)
 *
 * @param {Object} params
 * @param {string} params.paymentMethod - Payment method (cash, bank_transfer, cheque)
 * @param {string} params.bankAccountId - Bank account ID
 * @param {number} params.amountPaisa - Amount in paisa (integer)
 * @param {number} [params.amount] - Amount in rupees (backward compatibility)
 * @param {mongoose.ClientSession} [params.session] - MongoDB session
 * @returns {Promise<BankAccount|null>} Updated bank account or null for cash
 */
async function applyPaymentToBank({
  paymentMethod,
  bankAccountId,
  amountPaisa,
  session,
}) {
  // Cash payments don't require bank account
  if (paymentMethod === "cash") {
    return null;
  }

  // Bank transfer and cheque require valid payment method
  if (!["bank_transfer", "cheque"].includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  if (!bankAccountId) {
    throw new Error("Bank account ID is required");
  }

  const bankAccount =
    await BankAccount.findById(bankAccountId).session(session);
  if (!bankAccount) {
    throw new Error("Bank account not found");
  }
  console.log("amountPaisa", amountPaisa);
  // Increment balance in paisa (integer addition - no float errors!)
  bankAccount.balancePaisa += amountPaisa;
  await bankAccount.save({ session });
  return bankAccount;
}
export { applyPaymentToBank };
