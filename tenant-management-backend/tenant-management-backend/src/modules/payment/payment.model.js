import mongoose from "mongoose";
import { paisaToRupees } from "../../utils/moneyUtil.js";

const paymentSchema = new mongoose.Schema(
  {
    rent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rent",
      required: false,
    },
    cam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cam",
      required: false,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: false,
    },

    // ============================================
    // FINANCIAL FIELDS - STORED AS PAISA (INTEGERS)
    // ============================================
    amountPaisa: {
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
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cheque", "bank_transfer", "cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "overdue", "cancelled"],
      default: "pending",
    },
    receipt: {
      url: String,
      publicId: String,
      generatedAt: Date,
    },
    bankVerifiedDate: {
      type: Date,
      required: false,
    },
    receiptGeneratedDate: {
      type: Date,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    transactionRef: {
      type: String,
      required: false,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    allocations: {
      rent: {
        rentId: mongoose.Schema.Types.ObjectId,
        amountPaisa: Number, // Total amount allocated to rent

        // NEW: Unit-level allocations for multi-unit rents
        // Each allocation specifies which unit and how much was paid
        unitAllocations: [
          {
            unitId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Unit",
              required: true,
            },
            amountPaisa: {
              type: Number,
              required: true,
              min: 0,
            },
          },
        ],
      },
      cam: {
        camId: mongoose.Schema.Types.ObjectId,
        paidAmountPaisa: Number, // Amount paid for CAM charges
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Top-level amount in rupees (frontend-facing field)
        ret.amount = paisaToRupees(ret.amountPaisa);

        // Allocation conversions
        if (ret.allocations?.rent) {
          ret.allocations.rent.amount = paisaToRupees(
            ret.allocations.rent.amountPaisa ?? 0,
          );
          ret.allocations.rent.unitAllocations =
            ret.allocations.rent.unitAllocations?.map((ua) => ({
              ...ua,
              amount: paisaToRupees(ua.amountPaisa),
            }));
        }
        if (ret.allocations?.cam) {
          ret.allocations.cam.paidAmount = paisaToRupees(
            ret.allocations.cam.paidAmountPaisa ?? 0,
          );
        }

        return ret;
      },
    },
  },
);

paymentSchema.pre("save", function () {
  // Ensure amount is an integer (paisa)
  if (!Number.isInteger(this.amountPaisa)) {
    throw new Error(
      `Payment amount must be integer paisa, got: ${this.amountPaisa}`,
    );
  }

  // Validate unit allocations if present
  if (this.allocations?.rent?.unitAllocations?.length > 0) {
    const totalAllocated = this.allocations.rent.unitAllocations.reduce(
      (sum, ua) => sum + ua.amountPaisa,
      0,
    );

    // Total unit allocations should match rent allocation amount
    if (totalAllocated !== this.allocations.rent.amountPaisa) {
      throw new Error(
        `Unit allocations (${totalAllocated} paisa) don't match rent amount (${this.allocations.rent.amountPaisa} paisa)`,
      );
    }

    // Each unit allocation must be an integer
    this.allocations.rent.unitAllocations.forEach((ua) => {
      if (!Number.isInteger(ua.amountPaisa)) {
        throw new Error(
          `Unit allocation must be integer paisa, got: ${ua.amountPaisa}`,
        );
      }
    });
  }
});
paymentSchema.index({ tenant: 1, paymentDate: -1 });
paymentSchema.index({ rent: 1 });
paymentSchema.index({ cam: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paymentStatus: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
