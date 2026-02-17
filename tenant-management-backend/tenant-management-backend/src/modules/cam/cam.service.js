import { Cam } from "./cam.model.js";
import { ledgerService } from "../ledger/ledger.service.js";
import { buildCamChargeJournal } from "../ledger/journal-builders/index.js";
import { getNepaliMonthDates } from "../../utils/nepaliDateHelper.js";
import { Tenant } from "../tenant/Tenant.Model.js";
import { rupeesToPaisa, paisaToRupees, formatMoney } from "../../utils/moneyUtil.js";
import dotenv from "dotenv";
dotenv.config();

async function createCam(camData, createdBy, session = null) {
  try {
    // Ensure paisa fields are present (convert if needed)
    if (!camData.amountPaisa && camData.amount) {
      camData.amountPaisa = rupeesToPaisa(camData.amount);
    }
    if (!camData.paidAmountPaisa) {
      camData.paidAmountPaisa = camData.paidAmount
        ? rupeesToPaisa(camData.paidAmount)
        : 0;
    }

    const cam = await Cam.create([camData], session ? { session } : {});

    console.log("✅ CAM created:", {
      id: cam[0]._id,
      amount: formatMoney(cam[0].amountPaisa),
      amountPaisa: cam[0].amountPaisa,
    });

    return {
      success: true,
      message: "Cam created successfully",
      data: cam[0],
    };
  } catch (error) {
    console.error("Failed to create cam:", error);
    return {
      success: false,
      message: "Failed to create cam",
      error: error.message,
    };
  }
}
export { createCam };

export const handleMonthlyCams = async () => {
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
    const overdueResult = await Cam.updateMany(
      {
        status: { $in: ["pending", "partially_paid"] },
        $or: [
          { nepaliYear: { $lt: npYear } },
          { nepaliYear: npYear, nepaliMonth: { $lt: npMonth } },
        ],
      },
      { $set: { status: "overdue" } }
    );
    console.log("Overdue cams updated:", overdueResult.modifiedCount);
    const tenants = await Tenant.find({ status: "active" }).lean();
    if (!tenants.length) {
      return { success: false, message: "No tenants found", count: 0 };
    }
    const existingCams = await Cam.find({
      nepaliMonth: npMonth,
      nepaliYear: npYear,
    }).select("tenant");
    const existingTenantIds = new Set(
      existingCams.map((c) => c.tenant.toString())
    );
    const camsToInsert = tenants
      .filter((tenant) => !existingTenantIds.has(tenant._id.toString()))
      .map((tenant) => {
        // Get paisa values from tenant (if available), otherwise convert from rupees
        const amountPaisa =
          tenant.camChargesPaisa || rupeesToPaisa(tenant.camCharges || 0);

        return {
          tenant: tenant._id,
          property: tenant.property,
          block: tenant.block,
          innerBlock: tenant.innerBlock,
          nepaliMonth: npMonth,
          nepaliYear: npYear,
          nepaliDate,
          
          // ✅ Store as PAISA (integers)
          amountPaisa,
          paidAmountPaisa: 0,
          
          // Backward compatibility (can remove later)
          amount: paisaToRupees(amountPaisa),
          paidAmount: 0,
          
          year: englishYear,
          month: englishMonth,
          nepaliDueDate: lastDay,
          englishDueDate: englishDueDate,
          status: "pending",
        };
      });
    if (camsToInsert.length) {
      const insertedCams = await Cam.insertMany(camsToInsert);
      for (const cam of insertedCams) {
        try {
          const camChargePayload = buildCamChargeJournal(cam, {
            createdBy: ADMIN_ID,
          });
          await ledgerService.postJournalEntry(camChargePayload, null);
        } catch (error) {
          console.error("Failed to record cam charge:", error);
        }
      }
      console.log("Monthly cams created:", camsToInsert.length);
    } else {
      console.log("No new monthly cams to create");
    }
    return {
      success: true,
      message: "Monthly cams handled successfully",
      count: camsToInsert.length,
      updatedOverdueCount: overdueResult.modifiedCount,
    };
  } catch (error) {
    console.error("Failed to handle monthly cams:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all CAMs, optionally filtered by nepaliMonth/nepaliYear.
 * Populates tenant for frontend matching (tenant + month/year).
 */
export const getCams = async (filters = {}) => {
  const query = {};
  if (filters.nepaliMonth != null) query.nepaliMonth = filters.nepaliMonth;
  if (filters.nepaliYear != null) query.nepaliYear = filters.nepaliYear;
  const cams = await Cam.find(query)
    .populate("tenant")
    .populate("property")
    .populate("block")
    .populate("innerBlock")
    .lean();
  
  // ✅ Add formatted money values to response
  const camsWithFormatted = cams.map((cam) => ({
    ...cam,
    formatted: {
      amount: formatMoney(cam.amountPaisa || rupeesToPaisa(cam.amount || 0)),
      paidAmount: formatMoney(cam.paidAmountPaisa || rupeesToPaisa(cam.paidAmount || 0)),
      remainingAmount: formatMoney(
        (cam.amountPaisa || rupeesToPaisa(cam.amount || 0)) -
        (cam.paidAmountPaisa || rupeesToPaisa(cam.paidAmount || 0))
      ),
    },
  }));
  
  return camsWithFormatted;
};
