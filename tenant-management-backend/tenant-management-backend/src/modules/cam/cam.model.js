import mongoose from "mongoose";

const camSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      required: true,
    },
    innerBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InnerBlock",
      required: true,
    },

    month: { type: Number, required: true, min: 1, max: 12 },
    nepaliMonth: { type: Number, required: true, min: 1, max: 12 },
    nepaliYear: { type: Number, required: true },
    nepaliDate: { type: Date, required: true },
    year: { type: Number, required: true },

    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmountPaisa: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue", "cancelled"],
      default: "pending",
    },
    paidDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    emailReminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Unique index to prevent duplicate CAM entries for same tenant + month/year
camSchema.index({ tenant: 1, nepaliMonth: 1, nepaliYear: 1 }, { unique: true });

camSchema.virtual("remainingAmountPaisa").get(function () {
  return this.amountPaisa - this.paidAmountPaisa;
});

camSchema.pre("save", function () {
  // Ensure amounts are integers
  if (!Number.isInteger(this.amountPaisa)) {
    throw new Error(
      `CAM amount must be integer paisa, got: ${this.amountPaisa}`,
    );
  }
  if (!Number.isInteger(this.paidAmountPaisa)) {
    throw new Error(
      `Paid amount must be integer paisa, got: ${this.paidAmountPaisa}`,
    );
  }

  // Validate paid amount doesn't exceed CAM amount (in paisa)
  if (this.paidAmountPaisa > this.amountPaisa) {
    throw new Error("Paid amount cannot exceed CAM amount");
  }

  // Update status based on payment (using paisa values)
  if (this.paidAmountPaisa === 0) {
    this.status = "pending";
  } else if (this.paidAmountPaisa >= this.amountPaisa) {
    this.status = "paid";
  } else {
    this.status = "partially_paid";
  }
});

export const Cam = mongoose.model("Cam", camSchema);
