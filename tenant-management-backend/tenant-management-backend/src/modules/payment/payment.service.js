import mongoose from "mongoose";
import { Rent } from "../rents/rent.Model.js";
import { Payment } from "./payment.model.js";
import { Cam } from "../cam/cam.model.js";
import { applyPaymentToBank } from "../banks/bank.domain.js";
import { generatePDFToBuffer } from "../../utils/rentGenrator.js";
import { sendEmail } from "../../config/nodemailer.js";
import { applyPaymentToCam } from "../cam/cam.domain.js";
import buildFilter from "../../utils/buildFilter.js";
import {
  buildRentPaymentPayload,
  buildCamPaymentPayload,
  mergePaymentPayloads,
  createPaymentRecord,
  calculateTotalAmountFromAllocations,
  validatePaymentAllocations,
} from "./payment.domain.js";
import { ledgerService } from "../ledger/ledger.service.js";
import {
  buildPaymentReceivedJournal,
  buildCamPaymentReceivedJournal,
} from "../ledger/journal-builders/index.js";
import {
  recordRentRevenue,
  recordCamRevenue,
} from "../revenue/revenue.service.js";
import { emitPaymentNotification } from "../../utils/payment.Notification.js";
import { handleReceiptSideEffects } from "../../reciepts/reciept.service.js";
import { rupeesToPaisa, formatMoney } from "../../utils/moneyUtil.js";

// ============================================
// IMPORT HELPER FUNCTIONS FOR MULTI-UNIT SUPPORT
// ============================================
import {
  getAllocationStrategy,
  calculateUnitPaymentSummary,
} from "./helpers/payment.allocation.helper.js";
import {
  validatePaymentNotExceeding,
  validateCamPaymentNotExceeding,
  validatePaisaIntegrity,
} from "./helpers/payment-validation.helper.js";
import {
  applyPaymentToRent as applyPaymentToRentHelper,
  updateRentStatus,
  calculateRentRemaining,
  getUnitPaymentDetails,
} from "./helpers/rent-payment.helper.js";

/**
 * ============================================
 * ENHANCED CREATE PAYMENT - WITH MULTI-UNIT SUPPORT
 * ============================================
 *
 * Industry Standard: Transaction Script Pattern
 * - Single transaction for all operations
 * - Fail-fast validation
 * - Atomic commits with rollback on error
 *
 * Features:
 * 1. ✅ Supports single-unit rents (backward compatible)
 * 2. ✅ Supports multi-unit rents with automatic allocation
 * 3. ✅ Supports manual unit allocations
 * 4. ✅ Maintains PDF and email generation
 * 5. ✅ All calculations in paisa (integer arithmetic)
 * 6. ✅ Proper validation at each step
 *
 * @param {Object} paymentData - Payment data including allocations
 * @returns {Object} Payment result with success flag
 */
export async function createPayment(paymentData) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      allocations,
      allocationStrategy = "proportional",
      ...rest
    } = paymentData;

    // ============================================
    // STEP 1: CONVERT AMOUNTS TO PAISA
    // ============================================
    if (allocations?.rent?.amount) {
      allocations.rent.amountPaisa = rupeesToPaisa(allocations.rent.amount);
    }
    if (allocations?.cam?.paidAmount) {
      allocations.cam.paidAmountPaisa = rupeesToPaisa(
        allocations.cam.paidAmount,
      );
    }

    // Convert unit allocations to paisa if provided
    if (allocations?.rent?.unitAllocations) {
      allocations.rent.unitAllocations = allocations.rent.unitAllocations.map(
        (ua) => ({
          unitId: ua.unitId,
          amountPaisa: ua.amountPaisa || rupeesToPaisa(ua.amount || 0),
        }),
      );
    }

    // ============================================
    // STEP 2: VALIDATE PAYMENT ALLOCATIONS
    // ============================================
    const validation = validatePaymentAllocations(allocations);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    let cam = null;
    let rent = null;
    let unitAllocationsResult = null; // Store allocation results for payment record

    // ============================================
    // STEP 3: HANDLE RENT PAYMENT (MULTI-UNIT AWARE)
    // ============================================
    if (allocations?.rent?.rentId) {
      rent = await Rent.findById(allocations.rent.rentId)
        .populate("tenant")
        .populate("property")
        .populate("units")
        .populate({
          path: "unitBreakdown.unit",
          select: "name",
        })
        .session(session);

      if (!rent) throw new Error("Rent not found");

      const rentAmountPaisa =
        allocations.rent.amountPaisa ||
        rupeesToPaisa(allocations.rent.amount || 0);

      // Validate paisa integrity
      validatePaisaIntegrity({ rentAmountPaisa }, ["rentAmountPaisa"]);

      // ============================================
      // MULTI-UNIT RENT HANDLING
      // ============================================
      if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
        console.log("Processing multi-unit rent payment...");

        // Get unit allocations (manual or auto-generated)
        let unitAllocations = allocations.rent.unitAllocations;

        if (!unitAllocations || unitAllocations.length === 0) {
          // Auto-allocate using specified strategy
          console.log(`Auto-allocating using strategy: ${allocationStrategy}`);
          const strategyFn = getAllocationStrategy(allocationStrategy);
          unitAllocations = strategyFn(rent.unitBreakdown, rentAmountPaisa);

          console.log("Generated allocations:", unitAllocations);
        } else {
          console.log("Using manual unit allocations:", unitAllocations);
        }

        // Validate allocations before applying
        validatePaymentNotExceeding(rent, rentAmountPaisa, unitAllocations);

        // Apply payment using helper (mutates rent document)
        unitAllocationsResult = applyPaymentToRentHelper(
          rent,
          rentAmountPaisa,
          unitAllocations,
          paymentData.paymentDate,
          paymentData.receivedBy,
          allocationStrategy,
        );

        // Ensure Mongoose persists nested unitBreakdown changes
        rent.markModified("unitBreakdown");

        // Store unit allocations in payment allocations
        allocations.rent.unitAllocations =
          unitAllocationsResult || unitAllocations;

        console.log("Multi-unit payment applied successfully");
        console.log(
          "Unit payment summary:",
          calculateUnitPaymentSummary(rent.unitBreakdown),
        );
      }
      // ============================================
      // SINGLE-UNIT RENT HANDLING (LEGACY)
      // ============================================
      else {
        console.log("Processing single-unit rent payment...");

        // Validate payment doesn't exceed balance
        const remainingPaisa = calculateRentRemaining(rent);
        if (rentAmountPaisa > remainingPaisa) {
          throw new Error(
            `Payment ${formatMoney(rentAmountPaisa)} exceeds remaining balance ${formatMoney(remainingPaisa)}`,
          );
        }

        // Apply payment directly to rent
        rent.paidAmountPaisa = (rent.paidAmountPaisa || 0) + rentAmountPaisa;
        rent.lastPaidDate = paymentData.paymentDate;
        rent.lastPaidBy = paymentData.receivedBy;
      }

      // Update rent status (works for both single and multi-unit)
      updateRentStatus(rent);

      // Save rent with transaction
      await rent.save({ session });

      console.log("Rent payment completed:", {
        rentId: rent._id,
        status: rent.status,
        paidAmountPaisa: rent.paidAmountPaisa,
        remainingPaisa: calculateRentRemaining(rent),
      });
    }

    // ============================================
    // STEP 4: HANDLE CAM PAYMENT (UNCHANGED)
    // ============================================
    if (allocations?.cam?.camId) {
      cam = await Cam.findById(allocations.cam.camId)
        .populate("tenant")
        .populate("property")
        .session(session);

      if (!cam) throw new Error("CAM not found");

      const camAmountPaisa =
        allocations.cam.paidAmountPaisa ||
        rupeesToPaisa(allocations.cam.paidAmount || 0);

      validatePaisaIntegrity({ camAmountPaisa }, ["camAmountPaisa"]);
      validateCamPaymentNotExceeding(cam, camAmountPaisa);

      applyPaymentToCam(
        cam,
        camAmountPaisa,
        paymentData.paymentDate,
        paymentData.receivedBy,
      );

      await cam.save({ session });
    }

    // ============================================
    // STEP 5: UPDATE BANK ACCOUNT BALANCE
    // ============================================
    // For bank_transfer/cheque: increment bank balance by payment amount (paisa). Cash: no-op.
    const totalAmountPaisa = calculateTotalAmountFromAllocations(allocations);
    console.log("totalAmountPaisa", totalAmountPaisa);
    const bankAccount = await applyPaymentToBank({
      paymentMethod: paymentData.paymentMethod,
      bankAccountId: paymentData.bankAccountId,
      amountPaisa: totalAmountPaisa,
      session,
    });

    // ============================================
    // STEP 6: CREATE PAYMENT RECORD
    // ============================================
    const rentPayload = rent
      ? buildRentPaymentPayload({
          tenantId: paymentData.tenantId,
          amountPaisa: allocations.rent.amountPaisa,
          paymentDate: paymentData.paymentDate,
          nepaliDate: paymentData.nepaliDate,
          paymentMethod: paymentData.paymentMethod,
          paymentStatus: paymentData.paymentStatus,
          receivedBy: paymentData.receivedBy,
          note: paymentData.note,
          transactionRef: paymentData.transactionRef,
          adminId: paymentData.adminId,
          bankAccountId: paymentData.bankAccountId,
          rentId: rent._id,
          allocations: { rent: allocations.rent }, // Includes unitAllocations if multi-unit
        })
      : null;

    const camPayload = cam
      ? buildCamPaymentPayload({
          tenantId: paymentData.tenantId,
          amountPaisa: allocations.cam.paidAmountPaisa,
          paymentDate: paymentData.paymentDate,
          nepaliDate: paymentData.nepaliDate,
          paymentMethod: paymentData.paymentMethod,
          paymentStatus: paymentData.paymentStatus,
          receivedBy: paymentData.receivedBy,
          note: paymentData.note,
          transactionRef: paymentData.transactionRef,
          adminId: paymentData.adminId,
          bankAccountId: paymentData.bankAccountId,
          camId: cam._id,
          allocations: { cam: allocations.cam },
        })
      : null;

    const payload = mergePaymentPayloads(rentPayload, camPayload);
    const payment = await createPaymentRecord(payload, session);

    // ============================================
    // STEP 7: LEDGER ENTRIES
    // ============================================
    if (rent) {
      const rentAmountPaisa = allocations.rent.amountPaisa;
      const rentPaymentPayload = buildPaymentReceivedJournal(
        payment,
        rent,
        rentAmountPaisa,
      );
      await ledgerService.postJournalEntry(rentPaymentPayload, session);
    }

    if (cam) {
      const camAmountPaisa = allocations.cam.paidAmountPaisa;
      const camPaymentPayload = buildCamPaymentReceivedJournal(
        payment,
        cam,
        camAmountPaisa,
      );
      await ledgerService.postJournalEntry(camPaymentPayload, session);
    }

    // ============================================
    // STEP 8: REVENUE RECORDING
    // ============================================
    if (rent) {
      await recordRentRevenue({
        amountPaisa: allocations.rent.amountPaisa,
        paymentDate: payment.paymentDate,
        tenantId: paymentData.tenantId,
        rentId: rent._id,
        note: payment.note,
        adminId: payment.createdBy,
        session,
      });
    }

    if (cam) {
      await recordCamRevenue({
        amountPaisa: allocations.cam.paidAmountPaisa,
        paymentDate: payment.paymentDate,
        tenantId: paymentData.tenantId,
        camId: cam._id,
        note: payment.note,
        adminId: payment.createdBy,
        session,
      });
    }

    // ============================================
    // STEP 9: COMMIT TRANSACTION
    // ============================================
    await session.commitTransaction();
    session.endSession();

    console.log("Payment transaction committed successfully");

    // ============================================
    // STEP 10: ASYNC SIDE EFFECTS (NON-BLOCKING)
    // ============================================
    // These run after transaction commits and don't block the response

    // Emit payment notification
    emitPaymentNotification(
      {
        paymentId: payment._id,
        tenantId: payment.tenant,
        amountPaisa: payment.amountPaisa,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        note: payment.note,
        receivedBy: payment.receivedBy,
        bankAccountId: payment.bankAccount,
      },
      paymentData.adminId,
    ).catch(console.error);

    // Handle receipt side effects (PDF generation, email with attachment)
    const rentIdToPass =
      rent?._id?.toString() || payment.rent?.toString() || null;
    const camIdToPass = cam?._id?.toString() || payment.cam?.toString() || null;

    handleReceiptSideEffects({
      payment,
      rentId: rentIdToPass,
      camId: camIdToPass,
    }).catch(console.error);

    // ============================================
    // RETURN SUCCESS WITH DETAILED INFO
    // ============================================
    return {
      success: true,
      payment: {
        id: payment._id,
        amountPaisa: payment.amountPaisa,
        amount: payment.amountPaisa / 100,
        status: payment.paymentStatus,
      },
      rent: rent
        ? {
            id: rent._id,
            status: rent.status,
            paidAmountPaisa: rent.paidAmountPaisa,
            remainingPaisa: calculateRentRemaining(rent),
            useUnitBreakdown: rent.useUnitBreakdown,
            unitDetails: rent.useUnitBreakdown
              ? getUnitPaymentDetails(rent)
              : null,
          }
        : null,
      cam: cam
        ? {
            id: cam._id,
            status: cam.status,
          }
        : null,
      message: "Payment recorded successfully",
    };
  } catch (error) {
    // Rollback on any error
    await session.abortTransaction();
    session.endSession();

    console.error("Payment transaction failed:", error);

    return {
      success: false,
      error: error.message,
      message: "Payment recording failed",
    };
  }
}

/**
 * ============================================
 * SEND PAYMENT RECEIPT EMAIL (ENHANCED FOR MULTI-UNIT)
 * ============================================
 *
 * Generates PDF receipt and sends email
 * Now includes unit-level breakdown for multi-unit rents
 */
export const sendPaymentReceiptEmail = async (paymentId) => {
  try {
    // 1️⃣ Fetch payment with all related data
    const payment = await Payment.findById(paymentId)
      .populate("tenant")
      .populate("rent")
      .populate("cam")
      .populate("bankAccount");

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (!payment.tenant?.email) {
      throw new Error("Tenant email not found");
    }

    // 2️⃣ Fetch full rent details if rent payment exists
    let rent = null;
    if (payment.rent) {
      rent = await Rent.findById(payment.rent)
        .populate("tenant")
        .populate("property")
        .populate("units")
        .populate({
          path: "unitBreakdown.unit",
          select: "name",
        });
    }

    // Fetch CAM if exists
    const cam = payment.cam ? await Cam.findById(payment.cam) : null;

    // 3️⃣ Build "Paid For" description
    let paidFor = "";
    if (rent) {
      const nepaliMonths = [
        "Baisakh",
        "Jestha",
        "Ashadh",
        "Shrawan",
        "Bhadra",
        "Ashwin",
        "Kartik",
        "Mangsir",
        "Poush",
        "Magh",
        "Falgun",
        "Chaitra",
      ];
      const monthName =
        nepaliMonths[rent.nepaliMonth - 1] || `Month ${rent.nepaliMonth}`;
      paidFor = `${monthName} ${rent.nepaliYear}`;
    }
    if (cam) {
      const nepaliMonths = [
        "Baisakh",
        "Jestha",
        "Ashadh",
        "Shrawan",
        "Bhadra",
        "Ashwin",
        "Kartik",
        "Mangsir",
        "Poush",
        "Magh",
        "Falgun",
        "Chaitra",
      ];
      const camMonth =
        nepaliMonths[cam.nepaliMonth - 1] || `Month ${cam.nepaliMonth}`;
      paidFor = paidFor
        ? `${paidFor} & ${camMonth} ${cam.nepaliYear} (CAM)`
        : `${camMonth} ${cam.nepaliYear} (CAM)`;
    }

    const formattedPaymentDate = new Date(
      payment.paymentDate,
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 4️⃣ Get amounts from allocations
    const rentAmountPaisa =
      payment.allocations?.rent?.amountPaisa ||
      (payment.allocations?.rent?.amount
        ? rupeesToPaisa(payment.allocations.rent.amount)
        : 0);
    const camAmountPaisa =
      payment.allocations?.cam?.paidAmountPaisa ||
      (payment.allocations?.cam?.paidAmount
        ? rupeesToPaisa(payment.allocations.cam.paidAmount)
        : 0);

    const rentAmount = rentAmountPaisa / 100;
    const camAmount = camAmountPaisa / 100;

    // 5️⃣ Build PDF data with multi-unit breakdown if applicable
    const pdfData = {
      receiptNo: payment._id.toString(),
      amount: payment.amountPaisa / 100,
      paymentDate: formattedPaymentDate,
      tenantName: rent?.tenant?.name || payment.tenant?.name || "N/A",
      property: rent?.property?.name || "N/A",
      paidFor,
      paymentMethod:
        payment.paymentMethod === "cheque"
          ? "Cheque"
          : payment.paymentMethod === "cash"
            ? "Cash"
            : "Bank Transfer",
      receivedBy: rent?.lastPaidBy || "",
      rentAmount,
      camAmount,
      // NEW: Unit breakdown for multi-unit rents
      unitBreakdown: null,
    };

    // Add unit breakdown if multi-unit rent
    if (
      rent?.useUnitBreakdown &&
      payment.allocations?.rent?.unitAllocations?.length > 0
    ) {
      pdfData.unitBreakdown = payment.allocations.rent.unitAllocations.map(
        (ua) => {
          const uaId =
            (ua.unitId?._id ?? ua.unitId)?.toString?.() ?? String(ua.unitId);
          const unit = rent.unitBreakdown.find((ub) => {
            const ubId = ub.unit?._id
              ? ub.unit._id.toString()
              : ub.unit?.toString?.();
            return ubId === uaId;
          });
          return {
            unitName: unit?.unit?.name || "Unknown Unit",
            amountPaisa: ua.amountPaisa,
            amount: ua.amountPaisa / 100,
          };
        },
      );
    }

    // 6️⃣ Generate PDF
    const pdfBuffer = await generatePDFToBuffer(pdfData);

    // 7️⃣ Build email HTML with unit breakdown if applicable
    let unitBreakdownHtml = "";
    if (pdfData.unitBreakdown && pdfData.unitBreakdown.length > 0) {
      unitBreakdownHtml = `
        <p style="color:#555555; font-size:14px; line-height:1.5; margin-top:10px;">
          <strong>Unit Breakdown:</strong><br>
          ${pdfData.unitBreakdown
            .map((ub) => `${ub.unitName}: ${formatMoney(ub.amountPaisa)}`)
            .join("<br>")}
        </p>
      `;
    }

    const tenantName = payment.tenant?.name || "Tenant";
    const subject = "Payment Receipt - Rent and CAM Payment Confirmation";
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:20px;">
              <h2 style="color:#333333; font-size:24px; margin-bottom:10px;">Hello ${tenantName},</h2>
              <p style="color:#555555; font-size:16px; line-height:1.5;">
                Thank you for your payment of <strong>${formatMoney(payment.amountPaisa)}</strong> for <strong>${paidFor}</strong>.
              </p>
              <p style="color:#555555; font-size:16px; line-height:1.5;">
                Please find your payment receipt attached to this email.
              </p>
              <p style="color:#555555; font-size:14px; line-height:1.5; margin-top:20px;">
                <strong>Receipt Details:</strong><br>
                Receipt No: ${payment._id.toString()}<br>
                ${rentAmount > 0 ? `Rent Amount: Rs. ${rentAmount.toLocaleString()}<br>` : ""}
                ${camAmount > 0 ? `CAM Charges: Rs. ${camAmount.toLocaleString()}<br>` : ""}
                Total Amount: ${formatMoney(payment.amountPaisa)}<br>
                Payment Date: ${formattedPaymentDate}<br>
                Payment Method: ${pdfData.paymentMethod}
              </p>
              ${unitBreakdownHtml}
              <p style="color:#555555; font-size:16px; line-height:1.5; margin-top:30px;">
                Please keep this receipt for your records.
              </p>
              <p style="color:#555555; font-size:16px; line-height:1.5; margin-top:30px;">
                Thank you,<br>
                <strong>Sallyan House Management</strong>
              </p>
              <hr style="border:none; border-top:1px solid #e0e0e0; margin:20px 0;">
              <p style="color:#999999; font-size:12px; text-align:center;">
                This is an automated receipt. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 8️⃣ Send email
    await sendEmail({
      to: payment.tenant.email,
      subject,
      html,
      attachments: [
        {
          filename: `receipt-${payment._id.toString()}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return {
      success: true,
      message: "Payment receipt email sent successfully",
      emailSentTo: payment.tenant.email,
    };
  } catch (error) {
    console.error("Error sending payment receipt email:", error);
    return {
      success: false,
      message: "Failed to send payment receipt email",
      error: error.message,
    };
  }
};

// ============================================
// EXPORT OTHER EXISTING FUNCTIONS (UNCHANGED)
// ============================================

export const getFilteredPaymentHistoryService = async (
  tenantId,
  startDate,
  endDate,
  paymentMethod,
) => {
  try {
    const filter = buildFilter({
      tenantId,
      startDate,
      endDate,
      paymentMethod,
      dateField: "paymentDate",
    });

    const payments = await Payment.find(filter).sort({ paymentDate: -1 });

    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    console.error("Error getting filtered payment history:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const logPaymentActivity = async (
  paymentId,
  activityType,
  adminId = null,
  metadata = {},
) => {
  try {
    const { PaymentActivity } = await import("./paymentActivity.model.js");

    const activity = await PaymentActivity.create({
      payment: paymentId,
      activityType,
      performedBy: adminId,
      metadata,
    });

    const allActivities = await PaymentActivity.find({ payment: paymentId })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();

    if (allActivities.length > 5) {
      const activitiesToDelete = allActivities.slice(5);
      const idsToDelete = activitiesToDelete.map((a) => a._id);

      await PaymentActivity.deleteMany({
        _id: { $in: idsToDelete },
      });
    }

    return {
      success: true,
      data: activity,
    };
  } catch (error) {
    console.error("Error logging payment activity:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getPaymentActivities = async (paymentId) => {
  try {
    const { PaymentActivity } = await import("./paymentActivity.model.js");

    const activities = await PaymentActivity.find({ payment: paymentId })
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      success: true,
      data: activities,
    };
  } catch (error) {
    console.error("Error getting payment activities:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
