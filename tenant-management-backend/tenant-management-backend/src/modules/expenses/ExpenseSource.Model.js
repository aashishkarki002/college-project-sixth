import mongoose from "mongoose";
const expenseSourceSchema = new mongoose.Schema({
    name: { // Vendor, Salary, Refund, Loan, etc.
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ["OPERATING", "NON_OPERATING"],
        default: "OPERATING",
    },
    description: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});
export default mongoose.model("ExpenseSource", expenseSourceSchema);