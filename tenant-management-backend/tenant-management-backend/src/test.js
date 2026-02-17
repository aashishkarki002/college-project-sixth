/**
 * USAGE EXAMPLES - Quarterly Rent System
 *
 * Shows how to integrate quarterly rent helpers with your existing tenant/rent models
 */

import {
  calculateQuarterlyRentCycle,
  calculateNextQuarterlyRent,
  buildQuarterlyRentFilter,
  getCurrentQuarterInfo,
} from "./utils/quarterlyRentHelper.js";
import { getNepaliMonthDates } from "./utils/nepaliDateHelper.js";
import mongoose from "mongoose";
import { Tenant } from "./modules/tenant/Tenant.Model.js";
import { Rent } from "./modules/rents/rent.Model.js";

// ============================================================================
// EXAMPLE 1: TENANT CREATION WITH QUARTERLY RENT
// ============================================================================

/**
 * When creating a quarterly tenant, calculate initial rent cycle
 */
async function createQuarterlyTenant(tenantData, session) {
  const { npMonth, npYear } = getNepaliMonthDates();

  // Calculate quarterly rent cycle from today (first charge)
  const rentCycle = calculateQuarterlyRentCycle({
    startYear: npYear,
    startMonth: npMonth,
    startDay: 1, // Charge on 1st of month
  });

  console.log("Initial Quarterly Rent Cycle:");
  console.log("├─ Charge Date:", rentCycle.chargeDate.nepali);
  console.log("├─ Due Date:", rentCycle.dueDate.nepali);
  console.log("├─ Coverage:", rentCycle.coverageMonths.join(", "));
  console.log("└─ Quarter:", rentCycle.coverageQuarter);

  // Create tenant with quarterly settings
  const tenant = await Tenant.create(
    [
      {
        ...tenantData,
        rentPaymentFrequency: "quarterly",
        quarterlyRentAmount: tenantData.totalRent * 3, // 3 months
        nextRentDueDate: rentCycle.dueDate.english, // Store as Date
        lastRentChargedDate: rentCycle.chargeDate.english,
      },
    ],
    { session }
  );

  // Create initial rent record
  await Rent.create(
    [
      {
        tenant: tenant[0]._id,
        rentAmount: tenant[0].quarterlyRentAmount,
        rentFrequency: "quarterly",

        // Current period (what this rent covers)
        nepaliMonth: rentCycle.chargeDate.month,
        nepaliYear: rentCycle.chargeDate.year,
        englishMonth: rentCycle.chargeDate.english.getMonth() + 1,
        englishYear: rentCycle.chargeDate.english.getFullYear(),

        // Due date (when payment is expected)
        nepaliDueDate: rentCycle.dueDate.english,
        englishDueDate: rentCycle.dueDate.english,

        status: "pending",
        paidAmount: 0,
      },
    ],
    { session }
  );

  return tenant[0];
}

// ============================================================================
// EXAMPLE 2: SCHEDULED JOB - CREATE NEXT QUARTER'S RENT
// ============================================================================

/**
 * Cron job runs on 1st of each month (Nepali calendar)
 * Creates rent records for quarterly tenants whose next cycle starts
 */
async function createQuarterlyRentsJob() {
  const { npMonth, npYear, firstDayDate, lastDayEndDate } =
    getNepaliMonthDates();

  console.log(`\n[Quarterly Rent Job] Running for ${npYear}-${npMonth}`);

  // Find quarterly tenants whose next rent is due this month
  const quarterlyTenants = await Tenant.find({
    rentPaymentFrequency: "quarterly",
    isActive: true,
    nextRentDueDate: {
      $gte: firstDayDate,
      $lt: lastDayEndDate,
    },
  });

  console.log(`Found ${quarterlyTenants.length} quarterly tenants due`);

  for (const tenant of quarterlyTenants) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Calculate next rent cycle based on last charge
      const nextCycle = calculateNextQuarterlyRent({
        lastChargeDate: tenant.lastRentChargedDate,
        frequencyMonths: 3,
      });

      console.log(`\nTenant: ${tenant.name}`);
      console.log("├─ Next Charge:", nextCycle.chargeDate.nepali);
      console.log("├─ Next Due:", nextCycle.dueDate.nepali);
      console.log("└─ Coverage Quarter:", nextCycle.coverageQuarter);

      // Create rent record
      await Rent.create(
        [
          {
            tenant: tenant._id,
            property: tenant.property,
            block: tenant.block,
            innerBlock: tenant.innerBlock,
            units: tenant.units,

            rentAmount: tenant.quarterlyRentAmount,
            rentFrequency: "quarterly",

            nepaliMonth: nextCycle.chargeDate.month,
            nepaliYear: nextCycle.chargeDate.year,
            nepaliDueDate: nextCycle.dueDate.english,

            englishMonth: nextCycle.chargeDate.english.getMonth() + 1,
            englishYear: nextCycle.chargeDate.english.getFullYear(),
            englishDueDate: nextCycle.dueDate.english,

            status: "pending",
            paidAmount: 0,
            createdBy: "system",
          },
        ],
        { session }
      );

      // Update tenant's next due date
      tenant.lastRentChargedDate = nextCycle.chargeDate.english;
      tenant.nextRentDueDate = nextCycle.dueDate.english;
      await tenant.save({ session });

      await session.commitTransaction();
      console.log("✓ Rent created successfully");
    } catch (error) {
      await session.abortTransaction();
      console.error(`✗ Failed for tenant ${tenant.name}:`, error.message);
    } finally {
      session.endSession();
    }
  }
}

// ============================================================================
// EXAMPLE 3: FILTERING RENTS BY QUARTER
// ============================================================================

/**
 * Get all quarterly rents for Q1 2082
 */
async function getQuarterlyRentsForQ1() {
  const filter = buildQuarterlyRentFilter({
    year: 2082,
    quarter: 1, // Baisakh, Jestha, Ashadh
    status: "pending",
  });

  const rents = await Rent.find(filter).populate("tenant");

  console.log("\nQ1 2082 Pending Rents:");
  rents.forEach((rent) => {
    console.log(`├─ ${rent.tenant.name}: Rs. ${rent.rentAmount}`);
  });

  return rents;
}

/**
 * Get all rents due in a specific month
 */
async function getRentsDueInMonth(year, month) {
  // Get English date range for the Nepali month
  const monthDates = getNepaliMonthDates(year, month - 1); // Convert to 0-based

  const filter = buildQuarterlyRentFilter({
    dueDateStart: monthDates.firstDayDate,
    dueDateEnd: monthDates.lastDayEndDate, // Exclusive
  });

  const rents = await Rent.find(filter).populate("tenant");

  console.log(`\nRents due in ${year}-${month}:`);
  rents.forEach((rent) => {
    console.log(
      `├─ ${rent.tenant.name}: Due ${monthDates.nepaliMonthName} ${year}`
    );
  });

  return rents;
}

/**
 * Get current quarter's rents for a specific tenant
 */
async function getTenantCurrentQuarterRents(tenantId) {
  const currentQuarter = getCurrentQuarterInfo();

  const filter = buildQuarterlyRentFilter({
    tenantId,
    year: currentQuarter.year,
    quarter: currentQuarter.quarter,
  });

  const rents = await Rent.find(filter).sort({ nepaliDueDate: 1 });

  console.log(`\nTenant's ${currentQuarter.quarterName} rents:`);
  rents.forEach((rent) => {
    console.log(`├─ Month ${rent.nepaliMonth}: ${rent.status}`);
  });

  return rents;
}

// ============================================================================
// EXAMPLE 4: DASHBOARD QUERIES
// ============================================================================

/**
 * Get quarterly revenue summary
 */
async function getQuarterlyRevenueSummary(year, quarter) {
  const filter = buildQuarterlyRentFilter({ year, quarter });

  const summary = await Rent.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRent: { $sum: "$rentAmount" },
        totalPaid: { $sum: "$paidAmount" },
        totalPending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, "$rentAmount", 0],
          },
        },
        rentCount: { $sum: 1 },
      },
    },
  ]);

  console.log(`\nQ${quarter} ${year} Summary:`);
  console.log(`├─ Total Rent: Rs. ${summary[0]?.totalRent || 0}`);
  console.log(`├─ Collected: Rs. ${summary[0]?.totalPaid || 0}`);
  console.log(`├─ Pending: Rs. ${summary[0]?.totalPending || 0}`);
  console.log(`└─ Records: ${summary[0]?.rentCount || 0}`);

  return summary[0];
}

// ============================================================================
// EXAMPLE 5: MIGRATION SCRIPT - CONVERT MONTHLY TO QUARTERLY
// ============================================================================

/**
 * Convert existing monthly tenant to quarterly billing
 */
async function migrateToQuarterly(
  tenantId,
  effectiveFromYear,
  effectiveFromMonth
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenant = await Tenant.findById(tenantId).session(session);

    if (tenant.rentPaymentFrequency === "quarterly") {
      throw new Error("Tenant is already on quarterly billing");
    }

    // Calculate new quarterly amount
    const quarterlyAmount = tenant.totalRent * 3;

    // Calculate first quarterly cycle
    const firstCycle = calculateQuarterlyRentCycle({
      startYear: effectiveFromYear,
      startMonth: effectiveFromMonth,
      startDay: 1,
    });

    // Update tenant
    tenant.rentPaymentFrequency = "quarterly";
    tenant.quarterlyRentAmount = quarterlyAmount;
    tenant.nextRentDueDate = firstCycle.dueDate.english;
    tenant.lastRentChargedDate = firstCycle.chargeDate.english;
    tenant.rentFrequencyChangedAt = new Date();

    await tenant.save({ session });

    // Create first quarterly rent
    await Rent.create(
      [
        {
          tenant: tenant._id,
          rentAmount: quarterlyAmount,
          rentFrequency: "quarterly",
          nepaliMonth: firstCycle.chargeDate.month,
          nepaliYear: firstCycle.chargeDate.year,
          nepaliDueDate: firstCycle.dueDate.english,
          status: "pending",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    console.log(`✓ Migrated ${tenant.name} to quarterly billing`);
    console.log(
      `  First cycle: ${firstCycle.chargeDate.nepali} → ${firstCycle.dueDate.nepali}`
    );

    return tenant;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createQuarterlyTenant,
  createQuarterlyRentsJob,
  getQuarterlyRentsForQ1,
  getRentsDueInMonth,
  getTenantCurrentQuarterRents,
  getQuarterlyRevenueSummary,
  migrateToQuarterly,
};
