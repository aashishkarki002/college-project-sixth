import mongoose from "mongoose";
import { Tenant } from "../Tenant.Model.js";
import { Unit } from "../../units/Unit.Model.js";
import { parseUnitIds, filterOccupiedUnits } from "../helpers/unit.helper.js";
import {
  getNepaliMonthDates,
  getRentCycleDates,
} from "../../../utils/nepaliDateHelper.js";
import { createNewRent } from "../../rents/rent.service.js";
import { ledgerService } from "../../ledger/ledger.service.js";
import { buildRentChargeJournal } from "../../ledger/journal-builders/index.js";
import { createCam } from "../../cam/cam.service.js";
import { createSd } from "../../securityDeposits/sd.service.js";
import { calculateQuarterlyRentCycle } from "../../../utils/quarterlyRentHelper.js";
import { buildCamChargeJournal } from "../../ledger/journal-builders/camCharge.js";
import buildDocumentsFromFiles from "../helpers/fileUploadHelper.js";
import {
  rupeesToPaisa,
  paisaToRupees,
  formatMoney,
  divideMoney,
} from "../../../utils/moneyUtil.js";

import {
  calculateMultiUnitLease,
  buildUnitBreakdown,
} from "../domain/rent.calculator.service.js";

/**
 * ✅ REFACTORED: Calculate multi-unit lease financials using rent.calculator.service
 * Converts results to PAISA for storage
 */
function calculateMultiUnitLeaseInPaisa(unitLeaseConfigs, tdsPercentage) {
  // Use the calculator service (works in rupees)
  const calculation = calculateMultiUnitLease(unitLeaseConfigs, tdsPercentage);

  // Convert all amounts to paisa and add paisa fields
  const calculatedUnits = calculation.units.map((unit) => ({
    unitId: unit.unitId,
    sqft: unit.sqft,
    pricePerSqft: unit.pricePerSqft,
    camRatePerSqft: unit.camRatePerSqft,
    securityDeposit: unit.securityDeposit,

    // ✅ Store as PAISA (integers - source of truth)
    grossMonthlyPaisa: rupeesToPaisa(unit.grossMonthly),
    totalTdsPaisa: rupeesToPaisa(unit.totalTds),
    rentMonthlyPaisa: rupeesToPaisa(unit.rentMonthly),
    camMonthlyPaisa: rupeesToPaisa(unit.camMonthly),
    netMonthlyPaisa: rupeesToPaisa(unit.netMonthly),
    securityDepositPaisa: rupeesToPaisa(unit.securityDeposit),
    pricePerSqftPaisa: rupeesToPaisa(unit.pricePerSqft),
    camRatePerSqftPaisa: rupeesToPaisa(unit.camRatePerSqft),

    // For logging only (from calculator service)
    grossMonthly: unit.grossMonthly,
    totalTds: unit.totalTds,
    rentMonthly: unit.rentMonthly,
    camMonthly: unit.camMonthly,
    netMonthly: unit.netMonthly,
  }));

  // Convert totals to paisa
  const totals = {
    sqft: calculation.totals.sqft,

    // Integer sums in paisa (no accumulation errors)
    grossMonthlyPaisa: rupeesToPaisa(calculation.totals.grossMonthly),
    totalTdsPaisa: rupeesToPaisa(calculation.totals.totalTds),
    rentMonthlyPaisa: rupeesToPaisa(calculation.totals.rentMonthly),
    camMonthlyPaisa: rupeesToPaisa(calculation.totals.camMonthly),
    netMonthlyPaisa: rupeesToPaisa(calculation.totals.netMonthly),
    securityDepositPaisa: rupeesToPaisa(calculation.totals.securityDeposit),

    // Weighted averages (from calculator service)
    weightedPricePerSqft: calculation.totals.weightedPricePerSqft,
    weightedCamRate: calculation.totals.weightedCamRate,

    // Rupee values for logging/backward compatibility
    grossMonthly: calculation.totals.grossMonthly,
    totalTds: calculation.totals.totalTds,
    rentMonthly: calculation.totals.rentMonthly,
    camMonthly: calculation.totals.camMonthly,
    netMonthly: calculation.totals.netMonthly,
    securityDeposit: calculation.totals.securityDeposit,
  };

  return { units: calculatedUnits, totals };
}

/**
 * ✅ SIMPLIFIED: Calculate rent by frequency using DIRECT INTEGER MATH
 * No precision loss from paisa→rupees→paisa conversions
 */
function calculateRentByFrequencyInPaisa(
  monthlyRentPaisa,
  frequency,
  frequencyMonths = 3,
) {
  console.log(`\n🔢 Calculate Rent by Frequency:`);
  console.log(`├─ Monthly Rent (paisa): ${monthlyRentPaisa}`);
  console.log(`├─ Frequency: ${frequency}`);
  console.log(`└─ Frequency Months: ${frequencyMonths}`);

  if (frequency === "quarterly") {
    // ✅ SIMPLE INTEGER MULTIPLICATION - No precision loss!
    const chargeAmountPaisa = monthlyRentPaisa * frequencyMonths;

    console.log(`\n✅ Quarterly Calculation:`);
    console.log(
      `├─ ${monthlyRentPaisa} × ${frequencyMonths} = ${chargeAmountPaisa} paisa`,
    );
    console.log(`└─ Display: ${formatMoney(chargeAmountPaisa)}`);

    return {
      chargeAmountPaisa, // Integer - exact!
      chargeAmount: paisaToRupees(chargeAmountPaisa), // For display
      periodMonths: frequencyMonths,
    };
  }

  // Monthly - just return the same amount
  console.log(`\n✅ Monthly Calculation:`);
  console.log(`└─ Charge Amount: ${formatMoney(monthlyRentPaisa)}`);

  return {
    chargeAmountPaisa: monthlyRentPaisa,
    chargeAmount: paisaToRupees(monthlyRentPaisa),
    periodMonths: 1,
  };
}

/**
 */
export async function createTenantTransaction(body, files, adminId, session) {
  // ============================================
  // 1-2. PARSE INPUT & VALIDATE (unchanged)
  // ============================================
  const {
    npMonth,
    npYear,
    nepaliDate,
    englishMonth,
    englishYear,
    lastDay,
    nepaliDueDate,
  } = getNepaliMonthDates();

  if (body.unitNumber && !body.units) {
    // Normalize unitNumber -> units
    // - If unitNumber is already an array of IDs, use it directly
    // - If it's a single string, wrap it in an array
    body.units = Array.isArray(body.unitNumber)
      ? body.unitNumber
      : [body.unitNumber];
  }
  // ✅ Normalize unit IDs (support string | array | unitLeases)
  let unitIds = [];

  if (Array.isArray(body.unitLeases)) {
    unitIds = parseUnitIds(body.unitLeases.map((ul) => ul.unitId));
  } else {
    const rawUnits = body.unitIds ?? body.units ?? body.unitNumber;

    unitIds = Array.isArray(rawUnits) ? rawUnits : rawUnits ? [rawUnits] : [];
  }

  if (unitIds.length === 0) {
    throw new Error("At least one unit must be selected");
  }

  const usePerUnitConfig = Array.isArray(body.unitLeases);
  let unitLeaseConfigs = [];

  if (usePerUnitConfig) {
    unitLeaseConfigs = body.unitLeases;
  } else {
    // ✅ Build default unit lease configs from shared values
    unitLeaseConfigs = unitIds.map((unitId) => ({
      unitId,
      leasedSquareFeet: body.leasedSquareFeet,
      pricePerSqft: body.pricePerSqft,
      camRatePerSqft: body.camRatePerSqft,
    }));
  }

  const units = await Unit.find({ _id: { $in: unitIds } }).session(session);
  if (units.length !== unitIds.length) {
    throw new Error("One or more units not found");
  }

  const occupied = filterOccupiedUnits(units);
  if (occupied.length) {
    throw new Error(
      `Units already occupied: ${occupied.map((u) => u.name).join(", ")}`,
    );
  }

  // ============================================
  // 3. ✅ CALCULATE ALL FINANCIALS IN PAISA
  // ============================================
  const tdsPercentage = 10;

  // ✅ Use calculator service, then convert to paisa
  const originalCalculation = calculateMultiUnitLease(
    unitLeaseConfigs,
    tdsPercentage,
  );
  const leaseCalculation = calculateMultiUnitLeaseInPaisa(
    unitLeaseConfigs,
    tdsPercentage,
  );
  const { units: calculatedUnits, totals } = leaseCalculation;

  // ============================================
  // 4. CALCULATE RENT CYCLE DATES (unchanged)
  // ============================================
  const isQuarterly = body.rentPaymentFrequency === "quarterly";
  const frequencyMonths =
    isQuarterly && Number.isFinite(Number(body.frequencyMonths))
      ? Number(body.frequencyMonths)
      : 3;

  let rentCycleData;
  if (isQuarterly) {
    rentCycleData = calculateQuarterlyRentCycle({
      startYear: npYear,
      startMonth: npMonth,
      startDay: 1,
    });
    const quarterlyDueDates = getRentCycleDates({
      startYear: npYear,
      startMonth: npMonth,
      frequencyMonths,
    });
    rentCycleData = {
      ...rentCycleData,
      dueDate: {
        ...rentCycleData.dueDate,
        nepali: quarterlyDueDates.rentDueNp,
        english: quarterlyDueDates.rentDueDate,
        year: quarterlyDueDates.nepaliDueYear,
        month: quarterlyDueDates.nepaliDueMonth,
      },
    };
  } else {
    // Monthly rent: due date is 1st of next month
    const monthlyDueDates = getRentCycleDates({
      startYear: npYear,
      startMonth: npMonth,
      frequencyMonths: 1, // ← Monthly = 1 month frequency
    });

    rentCycleData = {
      chargeDate: {
        nepali: `${npYear}-${String(npMonth).padStart(2, "0")}-01`,
        english: new Date(),
        year: npYear,
        month: npMonth,
      },
      dueDate: {
        nepali: monthlyDueDates.rentDueNp, // ← 1st of next month
        english: monthlyDueDates.rentDueDate, // ← English Date for 1st of next month
        year: monthlyDueDates.nepaliDueYear, // ← Next month's year
        month: monthlyDueDates.nepaliDueMonth, // ← Next month (1-based)
      },
    };
  }

  // ============================================
  // 5. PROCESS FILE UPLOADS (unchanged)
  // ============================================
  const documents = await buildDocumentsFromFiles(files);

  // ============================================
  // 6. ✅ CREATE TENANT WITH PAISA VALUES
  // ============================================
  const tenant = await Tenant.create(
    [
      {
        ...body,
        units: unitIds,
        documents,

        // ✅ CRITICAL: Store as PAISA (integers)
        leasedSquareFeet: totals.sqft,
        totalRentPaisa: totals.rentMonthlyPaisa, // ← Integer!
        camChargesPaisa: totals.camMonthlyPaisa, // ← Integer!
        netAmountPaisa: totals.netMonthlyPaisa, // ← Integer!
        securityDepositPaisa: totals.securityDepositPaisa, // ← Integer!
        grossAmountPaisa: totals.grossMonthlyPaisa, // ← Integer!
        tdsPaisa: divideMoney(totals.totalTdsPaisa, totals.sqft), // ← TDS per sqft in paisa (integer)
        rentalRatePaisa: divideMoney(totals.rentMonthlyPaisa, totals.sqft), // ← Rate in paisa (integer)
        pricePerSqftPaisa: rupeesToPaisa(totals.weightedPricePerSqft),
        camRatePerSqftPaisa: rupeesToPaisa(totals.weightedCamRate),

        // ✅ BACKWARD COMPATIBILITY: Keep old rupee fields (optional)
        // These can be removed after migration is complete
        totalRent: totals.rentMonthly,
        camCharges: totals.camMonthly,
        netAmount: totals.netMonthly,
        securityDeposit: totals.securityDeposit,
        grossAmount: totals.grossMonthly,
        tds: totals.totalTds / totals.sqft,
        rentalRate: totals.rentMonthly / totals.sqft,
        pricePerSqft: totals.weightedPricePerSqft,
        camRatePerSqft: totals.weightedCamRate,

        tdsPercentage,
        cam: { ratePerSqft: totals.weightedCamRate },
        isDeleted: false,
        isActive: true,
        status: "active",
        useUnitBreakdown: true,

        // ✅ Quarterly in paisa
        ...(isQuarterly && {
          quarterlyRentAmountPaisa: totals.rentMonthlyPaisa * frequencyMonths,
          quarterlyRentAmount: totals.rentMonthly * frequencyMonths, // Backward compat
          nextRentDueDate: rentCycleData.dueDate.english,
          lastRentChargedDate: rentCycleData.chargeDate.english,
        }),
      },
    ],
    { session },
  );

  console.log("\n✅ Tenant Created:");
  console.log(`├─ Tenant ID: ${tenant[0]._id}`);
  console.log(`├─ totalRentPaisa: ${tenant[0].totalRentPaisa} (stored in DB)`);
  console.log(`└─ This is MONTHLY rent in paisa\n`);

  // ============================================
  // 7. OCCUPY UNITS (unchanged)
  // ============================================
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const unitCalc = calculatedUnits[i];

    await unit.occupy({
      tenant: tenant[0]._id,
      leaseSquareFeet: unitCalc.sqft,
      pricePerSqft: unitCalc.pricePerSqft,
      camRatePerSqft: unitCalc.camRatePerSqft,
      securityDeposit: unitCalc.securityDeposit,
      leaseStartDate: body.leaseStartDate,
      leaseEndDate: body.leaseEndDate,
      dateOfAgreementSigned: body.dateOfAgreementSigned,
      keyHandoverDate: body.keyHandoverDate,
      spaceHandoverDate: body.spaceHandoverDate,
      notes: body.notes || "",
    });
  }

  await Promise.all(units.map((u) => u.save({ session })));

  // ============================================
  // 8. ✅ CALCULATE RENT CHARGE IN PAISA
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("💰 CALCULATING RENT CHARGE");
  console.log("=".repeat(60));

  const rentFrequencyCalc = calculateRentByFrequencyInPaisa(
    totals.rentMonthlyPaisa, // ← Pass paisa, not rupees!
    body.rentPaymentFrequency,
    frequencyMonths,
  );

  console.log("\n📋 Rent Charge Result:");
  console.log(`├─ chargeAmountPaisa: ${rentFrequencyCalc.chargeAmountPaisa}`);
  console.log(
    `├─ Display: ${formatMoney(rentFrequencyCalc.chargeAmountPaisa)}`,
  );
  console.log(`├─ Period Months: ${rentFrequencyCalc.periodMonths}`);
  console.log(`└─ Frequency: ${body.rentPaymentFrequency}`);
  console.log("=".repeat(60) + "\n");

  // ============================================
  // 9. ✅ CREATE RENT RECORD WITH PAISA
  // ============================================

  // ✅ Calculate TDS for the period (SIMPLE INTEGER MULTIPLICATION)
  const periodTdsPaisa = totals.totalTdsPaisa * rentFrequencyCalc.periodMonths;

  console.log("\n📊 Rent Record Payload:");
  console.log(`├─ rentAmountPaisa: ${rentFrequencyCalc.chargeAmountPaisa}`);
  console.log(`├─ tdsAmountPaisa: ${periodTdsPaisa}`);
  console.log(`└─ paidAmountPaisa: 0`);

  const rentPayload = {
    tenant: tenant[0]._id,
    innerBlock: tenant[0].innerBlock,
    block: tenant[0].block,
    property: tenant[0].property,

    // ✅ Store as PAISA (integer)
    rentAmountPaisa: rentFrequencyCalc.chargeAmountPaisa,
    tdsAmountPaisa: periodTdsPaisa,
    paidAmountPaisa: 0,

    rentFrequency: body.rentPaymentFrequency,
    status: "pending",
    createdBy: adminId,
    units: unitIds,
    nepaliMonth: rentCycleData.chargeDate.month,
    nepaliYear: rentCycleData.chargeDate.year,
    nepaliDate: nepaliDate,
    englishMonth: isQuarterly
      ? rentCycleData.chargeDate.english.getMonth() + 1
      : englishMonth,
    englishYear: isQuarterly
      ? rentCycleData.chargeDate.english.getFullYear()
      : englishYear,
    nepaliDueDate: rentCycleData.dueDate.nepali,
    englishDueDate: rentCycleData.dueDate.english,
    lateFee: 0,
    useUnitBreakdown: true,

    unitBreakdown: calculatedUnits.map((u) => ({
      unit: u.unitId,
      rentAmountPaisa: u.rentMonthlyPaisa * rentFrequencyCalc.periodMonths,
      tdsAmountPaisa: u.totalTdsPaisa * rentFrequencyCalc.periodMonths,
      paidAmountPaisa: 0,
    })),
  };

  const rentResult = await createNewRent(rentPayload, session);
  if (!rentResult.success) {
    throw new Error(rentResult.message);
  }

  // ============================================
  // 10-12. LEDGER, CAM, SD (use paisa values)
  // ============================================
  const rentChargePayload = buildRentChargeJournal(rentResult.data);
  await ledgerService.postJournalEntry(rentChargePayload, session);

  const camResult = await createCam(
    {
      tenant: tenant[0]._id,
      property: tenant[0].property,
      block: tenant[0].block,
      innerBlock: tenant[0].innerBlock,
      nepaliMonth: npMonth,
      nepaliYear: npYear,
      nepaliDate,

      // ✅ Store CAM in paisa
      amountPaisa: totals.camMonthlyPaisa,
      amount: totals.camMonthly, // Backward compat

      status: "pending",
      year: englishYear,
      month: englishMonth,
      nepaliDueDate: rentCycleData.dueDate.nepali,
    },
    adminId,
    session,
  );

  if (!camResult.success) {
    throw new Error(camResult.message);
  }

  const camChargePayload = buildCamChargeJournal(camResult.data, {
    createdBy: adminId,
  });
  await ledgerService.postJournalEntry(camChargePayload, session);

  // ============================================
  // 11. ✅ CREATE SECURITY DEPOSIT (IN PAISA)
  //     Follow same pattern as CAM/Rent
  // ============================================
  const hasSecurityDepositAmount =
    body.securityDepositAmount != null &&
    body.securityDepositAmount !== "" &&
    !Number.isNaN(Number(body.securityDepositAmount));

  const baseSecurityDeposit =
    hasSecurityDepositAmount && Number(body.securityDepositAmount) > 0
      ? Number(body.securityDepositAmount)
      : totals.securityDeposit || 0;

  const hasSecurityDeposit =
    (body.securityDepositMode &&
      body.securityDepositMode !== "none" &&
      body.securityDepositMode !== "disabled") &&
    baseSecurityDeposit > 0;

  if (hasSecurityDeposit) {
    const mode = body.securityDepositMode;

    const sdPayload = {
      tenant: tenant[0]._id,
      property: tenant[0].property,
      block: tenant[0].block,
      innerBlock: tenant[0].innerBlock,

      // ✅ Store SD in paisa (source of truth)
      amountPaisa: rupeesToPaisa(baseSecurityDeposit),
      amount: baseSecurityDeposit, // Backward compat (rupees)

      status: mode === "bank_guarantee" ? "held_as_bg" : "paid",
      paidDate: new Date(),
      year: englishYear,
      month: englishMonth,
      nepaliMonth: npMonth,
      nepaliYear: npYear,
      nepaliDate: nepaliDate,
      createdBy: adminId,
      mode,
    };

    // Allow overriding amount for cash/bank transfer explicitly
    if (["cash", "bank_transfer"].includes(mode) && hasSecurityDepositAmount) {
      sdPayload.amountPaisa = rupeesToPaisa(Number(body.securityDepositAmount));
      sdPayload.amount = Number(body.securityDepositAmount);
    }

    if (mode === "cheque") {
      sdPayload.chequeDetails = {
        chequeNumber: body.chequeNumber,
        chequeDate: body.chequeDate,
        bankName: body.bankName,
      };
    }

    if (mode === "bank_guarantee") {
      sdPayload.bankGuaranteeDetails = {
        bgNumber: body.bgNumber,
        bankName: body.bankName,
        issueDate: body.bgIssueDate,
        expiryDate: body.bgExpiryDate,
      };
    }

    const sd = await createSd(sdPayload, adminId, session);
    if (!sd.success) {
      throw new Error(sd.message);
    }
  }

  // ============================================
  // 13. ✅ FINAL SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ TENANT CREATION COMPLETED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log("📊 Summary:");
  console.log("├─ Tenant ID:", tenant[0]._id);
  console.log("├─ Units:", unitIds.length);
  console.log("├─ Total Sqft:", totals.sqft);
  console.log("├─ Frequency:", body.rentPaymentFrequency);
  console.log("│");
  console.log("├─ 💰 TENANT (Monthly Values):");
  console.log("│  ├─ Monthly Rent:", formatMoney(totals.rentMonthlyPaisa));
  console.log("│  ├─ Monthly CAM:", formatMoney(totals.camMonthlyPaisa));
  console.log(
    "│  └─ Security Deposit:",
    formatMoney(totals.securityDepositPaisa),
  );
  console.log("│");
  console.log("├─ 📝 RENT RECORD (Period Values):");
  console.log(
    "│  ├─ Rent Charge:",
    formatMoney(rentFrequencyCalc.chargeAmountPaisa),
  );
  console.log("│  ├─ Period:", `${rentFrequencyCalc.periodMonths} month(s)`);
  console.log("│  └─ TDS:", formatMoney(periodTdsPaisa));
  console.log("│");
  console.log("└─ 💾 Stored Paisa Values:");
  console.log(
    "   ├─ Tenant.totalRentPaisa:",
    totals.rentMonthlyPaisa,
    "(monthly)",
  );
  console.log(
    "   ├─ Rent.rentAmountPaisa:",
    rentFrequencyCalc.chargeAmountPaisa,
    `(${rentFrequencyCalc.periodMonths} months)`,
  );
  console.log(
    "   └─ Calculation:",
    `${totals.rentMonthlyPaisa} × ${rentFrequencyCalc.periodMonths} = ${rentFrequencyCalc.chargeAmountPaisa}`,
  );
  console.log("=".repeat(60) + "\n");

  return tenant[0];
}
