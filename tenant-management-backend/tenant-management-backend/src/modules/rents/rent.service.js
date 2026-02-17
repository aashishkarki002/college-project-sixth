import { Rent } from "./rent.Model.js";
import { Tenant } from "../tenant/Tenant.Model.js";
import adminModel from "../auth/admin.Model.js";
import {
  getNepaliMonthDates,
  checkNepaliSpecialDays,
} from "../../utils/nepaliDateHelper.js";
import dotenv from "dotenv";
import { sendEmail } from "../../config/nodemailer.js";
import { ledgerService } from "../ledger/ledger.service.js";
import { buildRentChargeJournal } from "../ledger/journal-builders/index.js";
import Notification from "../notifications/Notification.Model.js";
import NepaliDate from "nepali-datetime";
import { getIO } from "../../config/socket.js";
import { Cam } from "../cam/cam.model.js";
import {
  rupeesToPaisa,
  paisaToRupees,
  formatMoney,
} from "../../utils/moneyUtil.js";

dotenv.config();

/**
 *  HELPER: Calculate rent totals from rent document
 * Handles both unit breakdown and legacy direct amounts
 *
 * @param {Object} rent - Rent document (mongoose object or plain object)
 * @returns {Object} Totals in paisa
 */
function calculateRentTotals(rent) {
  // If using unit breakdown, sum from units
  if (rent.useUnitBreakdown && rent.unitBreakdown?.length > 0) {
    const rentAmountPaisa = rent.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.rentAmountPaisa || 0),
      0,
    );

    const tdsAmountPaisa = rent.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.tdsAmountPaisa || 0),
      0,
    );

    const paidAmountPaisa = rent.unitBreakdown.reduce(
      (sum, unit) => sum + (unit.paidAmountPaisa || 0),
      0,
    );

    return {
      rentAmountPaisa,
      tdsAmountPaisa,
      paidAmountPaisa,
      remainingAmountPaisa: rentAmountPaisa - paidAmountPaisa,
      netAmountPaisa: rentAmountPaisa - tdsAmountPaisa, // After TDS
    };
  }

  // Otherwise use direct amounts from rent document
  // Access raw paisa values without getters
  const getRawPaisa = (field) => {
    if (rent.get && typeof rent.get === "function") {
      // Mongoose document - bypass getters
      return rent.get(field, null, { getters: false }) || 0;
    }
    // Plain object
    return rent[field] || 0;
  };

  const rentAmountPaisa = getRawPaisa("rentAmountPaisa");
  const tdsAmountPaisa = getRawPaisa("tdsAmountPaisa");
  const paidAmountPaisa = getRawPaisa("paidAmountPaisa");

  return {
    rentAmountPaisa,
    tdsAmountPaisa,
    paidAmountPaisa,
    remainingAmountPaisa: rentAmountPaisa - paidAmountPaisa,
    netAmountPaisa: rentAmountPaisa - tdsAmountPaisa,
  };
}

/**
 * ✅ REFACTORED: Get all rents with formatted amounts
 *
 * Returns rents with:
 * - totals: Raw paisa values (integers) for calculations
 * - formatted: Human-readable money strings for display
 */
export async function getRentsService() {
  try {
    const rents = await Rent.find()
      .sort({ nepaliDueDate: 1 })
      .populate({
        path: "tenant",
        match: { isDeleted: false },
        select: "name email",
      })
      .populate({ path: "innerBlock", select: "name" })
      .populate({ path: "block", select: "name" })
      .populate({ path: "property", select: "name" })
      .populate({ path: "units", select: "name" });

    const filteredRents = rents.filter((rent) => rent.tenant);

    const rentsWithFormatted = filteredRents.map((rent) => {
      // Convert to plain object WITHOUT getters (they interfere)
      const rentObj = rent.toObject({
        virtuals: false,
        getters: false, // ✅ CRITICAL: Don't apply paisa→rupees getters
      });

      // Calculate totals from unit breakdown or direct amounts
      const totals = calculateRentTotals(rent);

      // Get late fee (direct access, no getter)
      const lateFeePaisa =
        rent.get("lateFeePaisa", null, { getters: false }) || 0;

      return {
        ...rentObj,

        // ✅ RAW PAISA VALUES - for frontend calculations
        totals: {
          rentAmountPaisa: totals.rentAmountPaisa,
          tdsAmountPaisa: totals.tdsAmountPaisa,
          paidAmountPaisa: totals.paidAmountPaisa,
          remainingAmountPaisa: totals.remainingAmountPaisa,
          netAmountPaisa: totals.netAmountPaisa,
          lateFeePaisa,

          // Grand total (rent + late fee - what tenant owes)
          totalDuePaisa: totals.remainingAmountPaisa + lateFeePaisa,
        },

        // ✅ FORMATTED STRINGS - for display
        formatted: {
          rentAmount: formatMoney(totals.rentAmountPaisa),
          tdsAmount: formatMoney(totals.tdsAmountPaisa),
          paidAmount: formatMoney(totals.paidAmountPaisa),
          remainingAmount: formatMoney(totals.remainingAmountPaisa),
          netAmount: formatMoney(totals.netAmountPaisa),
          lateFee: formatMoney(lateFeePaisa),
          totalDue: formatMoney(totals.remainingAmountPaisa + lateFeePaisa),
        },
      };
    });

    return {
      success: true,
      rents: rentsWithFormatted,
    };
  } catch (error) {
    console.error("Error fetching rents:", error);
    return {
      success: false,
      message: "Rents fetching failed",
      error: error.message,
    };
  }
}

/**
 * ✅ REFACTORED: Get single rent by ID with formatted amounts
 */
export async function getRentByIdService(rentId) {
  try {
    const rent = await Rent.findById(rentId)
      .populate("tenant")
      .populate("innerBlock")
      .populate("block")
      .populate("property")
      .populate("units")
      .populate({
        path: "unitBreakdown.unit",
        select: "name",
      });

    if (!rent) {
      return {
        success: false,
        statusCode: 404,
        message: "Rent not found",
      };
    }

    const rentObj = rent.toObject({
      virtuals: false,
      getters: false,
    });

    const totals = calculateRentTotals(rent);
    const lateFeePaisa =
      rent.get("lateFeePaisa", null, { getters: false }) || 0;

    return {
      success: true,
      rent: {
        ...rentObj,
        totals: {
          rentAmountPaisa: totals.rentAmountPaisa,
          tdsAmountPaisa: totals.tdsAmountPaisa,
          paidAmountPaisa: totals.paidAmountPaisa,
          remainingAmountPaisa: totals.remainingAmountPaisa,
          netAmountPaisa: totals.netAmountPaisa,
          lateFeePaisa,
          totalDuePaisa: totals.remainingAmountPaisa + lateFeePaisa,
        },
        formatted: {
          rentAmount: formatMoney(totals.rentAmountPaisa),
          tdsAmount: formatMoney(totals.tdsAmountPaisa),
          paidAmount: formatMoney(totals.paidAmountPaisa),
          remainingAmount: formatMoney(totals.remainingAmountPaisa),
          netAmount: formatMoney(totals.netAmountPaisa),
          lateFee: formatMoney(lateFeePaisa),
          totalDue: formatMoney(totals.remainingAmountPaisa + lateFeePaisa),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching rent:", error);
    return {
      success: false,
      message: "Rent fetching failed",
      error: error.message,
    };
  }
}

/**
 * ✅ REFACTORED: Create new rent with paisa values
 *
 * @param {Object} rentData - Rent data (must include *Paisa fields)
 * @param {mongoose.ClientSession} session - Optional session for transactions
 */
export async function createNewRent(rentData, session = null) {
  try {
    // ✅ VALIDATION: Ensure paisa values are integers
    if (!Number.isInteger(rentData.rentAmountPaisa)) {
      throw new Error(
        `rentAmountPaisa must be an integer, got: ${rentData.rentAmountPaisa}`,
      );
    }

    if (!Number.isInteger(rentData.tdsAmountPaisa)) {
      throw new Error(
        `tdsAmountPaisa must be an integer, got: ${rentData.tdsAmountPaisa}`,
      );
    }

    // Set defaults
    rentData.paidAmountPaisa ??= 0;
    rentData.lateFeePaisa ??= 0;

    // Validate unit breakdown if present
    if (rentData.unitBreakdown?.length > 0) {
      rentData.unitBreakdown = rentData.unitBreakdown.map((ub) => {
        if (!Number.isInteger(ub.rentAmountPaisa)) {
          throw new Error(
            `Unit breakdown rentAmountPaisa must be integer, got: ${ub.rentAmountPaisa}`,
          );
        }

        return {
          ...ub,
          rentAmountPaisa: ub.rentAmountPaisa,
          tdsAmountPaisa: ub.tdsAmountPaisa ?? 0,
          paidAmountPaisa: ub.paidAmountPaisa ?? 0,
        };
      });
    }

    const opts = session ? { session } : {};
    const created = await Rent.create([rentData], opts);
    const rent = created[0];

    // Access raw paisa values (bypass getters)
    const rentAmountPaisaRaw = rent.get("rentAmountPaisa", null, {
      getters: false,
    });

    console.log("✅ Rent created:", {
      id: rent._id,
      amount: formatMoney(rentAmountPaisaRaw),
      amountPaisa: rentAmountPaisaRaw,
    });

    return {
      success: true,
      message: "Rent created successfully",
      data: rent,
    };
  } catch (error) {
    console.error("Error creating rent:", error);
    return {
      success: false,
      message: "Failed to create rent",
      error: error.message,
    };
  }
}

/**
 * ✅ REFACTORED: Handle monthly rent generation with paisa precision
 */
export async function handleMonthlyRents(adminId) {
  const createdBy = adminId || process.env.SYSTEM_ADMIN_ID;
  const {
    npMonth,
    npYear,
    nepaliDate,
    englishDueDate,
    lastDay,
    englishMonth,
    englishYear,
  } = getNepaliMonthDates();

  try {
    // Step 1: Update overdue rents
    const overdueResult = await Rent.updateMany(
      {
        status: { $in: ["pending", "partially_paid"] },
        $or: [
          { nepaliYear: { $lt: npYear } },
          { nepaliYear: npYear, nepaliMonth: { $lt: npMonth } },
        ],
      },
      { $set: { status: "overdue" } },
    );
    console.log("Overdue rents updated:", overdueResult.modifiedCount);

    // Step 2: Get active tenants
    const tenants = await Tenant.find({ status: "active" }).lean();

    if (!tenants.length) {
      return { success: false, message: "No tenants found", count: 0 };
    }

    // Step 3: Check existing rents for this month
    const existingRents = await Rent.find({
      nepaliMonth: npMonth,
      nepaliYear: npYear,
    }).select("tenant");

    const existingTenantIds = new Set(
      existingRents.map((r) => r.tenant.toString()),
    );

    // Step 4: Create new monthly rents with PAISA values
    const rentsToInsert = tenants
      .filter((tenant) => !existingTenantIds.has(tenant._id.toString()))
      .map((tenant) => {
        // ✅ Get paisa values from tenant (prefer *Paisa fields)
        const rentAmountPaisa =
          tenant.totalRentPaisa || rupeesToPaisa(tenant.totalRent || 0);

        const tdsAmountPaisa = tenant.tdsPaisa
          ? tenant.tdsPaisa * (tenant.leasedSquareFeet || 0)
          : rupeesToPaisa((tenant.tds || 0) * (tenant.leasedSquareFeet || 0));

        return {
          tenant: tenant._id,
          innerBlock: tenant.innerBlock,
          block: tenant.block,
          property: tenant.property,
          nepaliMonth: npMonth,
          nepaliYear: npYear,
          nepaliDate,

          // ✅ Store as PAISA (integers)
          rentAmountPaisa,
          tdsAmountPaisa,
          paidAmountPaisa: 0,
          lateFeePaisa: 0,

          units: tenant.units,
          createdBy,
          nepaliDueDate: lastDay,
          englishDueDate,
          englishMonth,
          englishYear,
          status: "pending",
          rentFrequency: tenant.rentPaymentFrequency || "monthly",
        };
      });

    if (rentsToInsert.length) {
      const insertedRents = await Rent.insertMany(rentsToInsert);

      // Create ledger entries for each rent
      for (const rent of insertedRents) {
        try {
          const rentChargePayload = buildRentChargeJournal(rent);
          await ledgerService.postJournalEntry(rentChargePayload, null);
        } catch (error) {
          console.error(
            `Failed to create ledger entry for rent ${rent._id}:`,
            error,
          );
          throw error;
        }
      }

      console.log("✅ Monthly rents created:", rentsToInsert.length);
      console.log(
        "   Total rent amount:",
        formatMoney(
          rentsToInsert.reduce((sum, r) => sum + r.rentAmountPaisa, 0),
        ),
      );
    } else {
      console.log("All rents for this month already exist");
    }

    return {
      success: true,
      message: "Rents processed successfully",
      createdCount: rentsToInsert.length,
      updatedOverdueCount: overdueResult.modifiedCount,
    };
  } catch (error) {
    console.error("Error in handleMonthlyRents:", error);
    return {
      success: false,
      message: "Rents processing failed",
      error: error.message,
    };
  }
}

/**
 * ✅ REFACTORED: Send email reminders with properly formatted amounts
 */
export async function sendEmailToTenants() {
  try {
    const { npMonth, npYear, lastDay } = getNepaliMonthDates();
    const { reminderDay } = checkNepaliSpecialDays({ forceTest: true });

    if (reminderDay) {
      return {
        success: true,
        message: "Today is not reminder day",
      };
    }

    const rents = await Rent.find({
      status: { $in: ["pending", "partially_paid"] },
      nepaliMonth: npMonth,
      nepaliYear: npYear,
      emailReminderSent: { $ne: true },
    }).populate("tenant");

    const cams = await Cam.find({
      status: { $in: ["pending", "partially_paid"] },
      nepaliMonth: npMonth,
      nepaliYear: npYear,
      emailReminderSent: { $ne: true },
    }).populate("tenant");

    const allPending = [...rents, ...cams];

    if (allPending.length === 0) {
      return {
        success: true,
        message: "No pending rents or cams found for this month",
      };
    }

    const io = getIO();

    // ✅ Use paisa values for accurate amounts
    const pendingTenants = allPending.map((item) => {
      const amountPaisa = item.rentAmountPaisa || item.amountPaisa || 0;

      return {
        tenantId: item.tenant?._id,
        tenantName: item.tenant?.name || "Unknown",
        tenantEmail: item.tenant?.email || "N/A",
        amountPaisa,
        amount: formatMoney(amountPaisa),
        status: item.status,
        dueDate: item.nepaliDueDate || lastDay,
        itemId: item._id,
        type: item.rentAmountPaisa ? "rent" : "cam",
      };
    });

    // Create notifications for admins
    const admins = await adminModel.find({ role: "admin" });
    const notificationPromises = admins.map(async (admin) => {
      const notification = await Notification.create({
        admin: admin._id,
        type: "RENT_REMINDER",
        title: "Rent Payment Reminder",
        message: `${rents.length} tenant(s) have pending rent payments for ${npYear}-${npMonth}`,
        data: {
          pendingCount: rents.length,
          tenants: pendingTenants,
          monthYear: `${npYear}-${npMonth}`,
          month: npMonth,
          year: npYear,
        },
        isRead: false,
      });

      if (io) {
        io.to(`admin:${admin._id}`).emit("new-notification", {
          notification: {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
          },
        });
      }
    });

    await Promise.all(notificationPromises);

    // Group by tenant and send emails
    const tenantMap = new Map();

    rents.forEach((rent) => {
      if (!rent.tenant?.email) return;

      const key = rent.tenant._id.toString();
      if (!tenantMap.has(key)) {
        tenantMap.set(key, { tenant: rent.tenant, rents: [], cams: [] });
      }
      tenantMap.get(key).rents.push(rent);
    });

    cams.forEach((cam) => {
      if (!cam.tenant?.email) return;

      const key = cam.tenant._id.toString();
      if (!tenantMap.has(key)) {
        tenantMap.set(key, { tenant: cam.tenant, rents: [], cams: [] });
      }
      tenantMap.get(key).cams.push(cam);
    });

    const sentRentIds = [];
    const sentCamIds = [];

    const emailPromises = Array.from(tenantMap.values()).map(
      async ({ tenant, rents: tenantRents, cams: tenantCams }) => {
        if (!tenant?.email) return;

        // ✅ Calculate totals in paisa, then format
        const rentTotalPaisa = tenantRents.reduce((sum, rent) => {
          const totals = calculateRentTotals(rent);
          return sum + totals.remainingAmountPaisa;
        }, 0);

        const camTotalPaisa = tenantCams.reduce(
          (sum, cam) => sum + (cam.amountPaisa || cam.amount * 100 || 0),
          0,
        );

        const totalAmountPaisa = rentTotalPaisa + camTotalPaisa;

        // Determine due date
        let nepaliDueDate;
        if (tenantRents.length > 0) {
          const dateStr = tenantRents[0].nepaliDueDate;
          const match = dateStr.match(/2\d{3}-\d{2}-(\d{2})/);
          if (match) {
            const nepaliDay = parseInt(match[1]);
            nepaliDueDate = new NepaliDate(
              tenantRents[0].nepaliYear,
              tenantRents[0].nepaliMonth - 1,
              nepaliDay,
            );
          } else {
            nepaliDueDate = lastDay || new NepaliDate(npYear, npMonth - 1, 30);
          }
        } else {
          nepaliDueDate = lastDay || new NepaliDate(npYear, npMonth - 1, 30);
        }

        const formattedDate = nepaliDueDate.format("YYYY-MMMM-DD");
        const monthYear = nepaliDueDate.format("YYYY-MMMM");
        const subject = "Reminder for Rent and CAM Payment";

        // ✅ Build payment details with formatted amounts
        let paymentDetails = "";
        if (tenantRents.length > 0) {
          paymentDetails += `
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #e0e0e0;">
              <strong>Rent:</strong> ${formatMoney(rentTotalPaisa)}
            </td>
          </tr>`;
        }
        if (tenantCams.length > 0) {
          paymentDetails += `
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #e0e0e0;">
              <strong>CAM Charges:</strong> ${formatMoney(camTotalPaisa)}
            </td>
          </tr>`;
        }

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Rent and CAM Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:20px;">
              <h2 style="color:#333333; font-size:24px; margin-bottom:10px;">Hello ${tenant.name},</h2>
              <p style="color:#555555; font-size:16px; line-height:1.5;">
                This is a reminder for your pending payments for <strong>${monthYear}</strong>.
              </p>
              <table width="100%" style="margin:20px 0; border-collapse:collapse;">
                ${paymentDetails}
                <tr>
                  <td style="padding:12px 0; border-top:2px solid #333333; border-bottom:2px solid #333333;">
                    <strong style="font-size:18px;">Total Amount:</strong> 
                    <strong style="font-size:18px; color:#d32f2f;">${formatMoney(totalAmountPaisa)}</strong>
                  </td>
                </tr>
              </table>
              <p style="color:#555555; font-size:16px; line-height:1.5;">
                Please pay the amount before <strong>${formattedDate}</strong>.
              </p>
              <p style="color:#555555; font-size:16px; line-height:1.5; margin-top:30px;">
                Thank you,<br>
                <strong>Your Management Team</strong>
              </p>
              <hr style="border:none; border-top:1px solid #e0e0e0; margin:20px 0;">
              <p style="color:#999999; font-size:12px; text-align:center;">
                This is an automated reminder. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

        try {
          await sendEmail({ to: tenant.email, subject, html });

          // Track successfully sent IDs
          tenantRents.forEach((rent) => sentRentIds.push(rent._id));
          tenantCams.forEach((cam) => sentCamIds.push(cam._id));
        } catch (emailError) {
          console.error(`Failed to send email to ${tenant.email}:`, emailError);
        }
      },
    );

    await Promise.all(emailPromises);

    // Mark emails as sent
    if (sentRentIds.length > 0) {
      await Rent.updateMany(
        { _id: { $in: sentRentIds } },
        { $set: { emailReminderSent: true } },
      );
    }

    if (sentCamIds.length > 0) {
      await Cam.updateMany(
        { _id: { $in: sentCamIds } },
        { $set: { emailReminderSent: true } },
      );
    }

    const sentCount = Array.from(tenantMap.values()).filter(
      ({ tenant }) => tenant?.email,
    ).length;
    const totalTenants = tenantMap.size;

    return {
      success: true,
      message: `Email sent to ${sentCount} out of ${totalTenants} tenants successfully`,
    };
  } catch (error) {
    console.error("Error sending emails:", error);
    return {
      success: false,
      message: "Failed to send emails",
      error: error.message,
    };
  }
}

export default handleMonthlyRents;
