import mongoose from "mongoose";

const paymentActivitySchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    activityType: {
      type: String,
      enum: [
        "VIEWED",
        "DOWNLOADED",
        "SHARED",
        "EMAILED",
        "LINK_COPIED",
        "EXPORTED_PDF",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false, // Can be null for system events
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for faster queries
paymentActivitySchema.index({ payment: 1, createdAt: -1 });

export const PaymentActivity = mongoose.model(
  "PaymentActivity",
  paymentActivitySchema
);
