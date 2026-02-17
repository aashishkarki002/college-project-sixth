import mongoose from "mongoose";

const externalPaymentSchema = new mongoose.Schema(
  {
    payerName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    nepaliDate: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: ["cheque", "bank_transfer", "cash"],
      default: "bank_transfer",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue", "cancelled"],
      default: "paid",
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

export const ExternalPayment = mongoose.model(
  "ExternalPayment",
  externalPaymentSchema,
);
