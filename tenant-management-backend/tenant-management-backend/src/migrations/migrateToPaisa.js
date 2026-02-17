/**
 * Database Migration: Convert all money fields to paisa format
 * 
 * This migration:
 * 1. Adds *Paisa fields to all models
 * 2. Migrates existing data: amountPaisa = Math.round(amount * 100)
 * 3. Keeps old fields for backward compatibility during transition
 * 
 * Run this migration after deploying the code changes.
 * 
 * Usage:
 * node -r esm src/migrations/migrateToPaisa.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Cam } from "../modules/cam/cam.model.js";
import { Payment } from "../modules/payment/payment.model.js";
import { Transaction } from "../modules/ledger/transactions/Transaction.Model.js";
import { Account } from "../modules/ledger/accounts/Account.Model.js";
import BankAccount from "../modules/banks/BankAccountModel.js";
import { Electricity } from "../modules/electricity/Electricity.Model.js";
import { Expense } from "../modules/expenses/Expense.Model.js";
import { Revenue } from "../modules/revenue/Revenue.Model.js";
import { Sd } from "../modules/securityDeposits/sd.model.js";
import { Maintenance } from "../modules/maintenance/Maintenance.Model.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Safely convert rupees to paisa, handling null/undefined
 */
function safeRupeesToPaisa(value) {
  if (value == null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Math.round(Number(value) * 100);
}

/**
 * Migrate CAM collection
 */
async function migrateCam() {
  console.log("\n📦 Migrating CAM collection...");
  const cams = await Cam.find({}).lean();
  let migrated = 0;

  for (const cam of cams) {
    const update = {};
    
    if (cam.amount != null && cam.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(cam.amount);
    }
    if (cam.paidAmount != null && cam.paidAmountPaisa == null) {
      update.paidAmountPaisa = safeRupeesToPaisa(cam.paidAmount);
    }

    if (Object.keys(update).length > 0) {
      await Cam.updateOne({ _id: cam._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${cams.length} CAM records`);
}

/**
 * Migrate Payment collection
 */
async function migratePayment() {
  console.log("\n📦 Migrating Payment collection...");
  const payments = await Payment.find({}).lean();
  let migrated = 0;

  for (const payment of payments) {
    const update = {};
    
    if (payment.amount != null && payment.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(payment.amount);
    }

    // Migrate allocations
    if (payment.allocations) {
      const allocations = { ...payment.allocations };
      let allocationsUpdated = false;

      if (allocations.rent && allocations.rent.amount != null && allocations.rent.amountPaisa == null) {
        allocations.rent.amountPaisa = safeRupeesToPaisa(allocations.rent.amount);
        allocationsUpdated = true;
      }

      if (allocations.cam) {
        if (allocations.cam.paidAmount != null && allocations.cam.paidAmountPaisa == null) {
          allocations.cam.paidAmountPaisa = safeRupeesToPaisa(allocations.cam.paidAmount);
          allocationsUpdated = true;
        }
        if (allocations.cam.amount != null && allocations.cam.paidAmountPaisa == null) {
          allocations.cam.paidAmountPaisa = safeRupeesToPaisa(allocations.cam.amount);
          allocationsUpdated = true;
        }
      }

      if (allocationsUpdated) {
        update.allocations = allocations;
      }
    }

    if (Object.keys(update).length > 0) {
      await Payment.updateOne({ _id: payment._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${payments.length} Payment records`);
}

/**
 * Migrate Transaction collection
 */
async function migrateTransaction() {
  console.log("\n📦 Migrating Transaction collection...");
  const transactions = await Transaction.find({}).lean();
  let migrated = 0;

  for (const transaction of transactions) {
    const update = {};
    
    if (transaction.totalAmount != null && transaction.totalAmountPaisa == null) {
      update.totalAmountPaisa = safeRupeesToPaisa(transaction.totalAmount);
    }

    if (Object.keys(update).length > 0) {
      await Transaction.updateOne({ _id: transaction._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${transactions.length} Transaction records`);
}

/**
 * Migrate Account collection
 */
async function migrateAccount() {
  console.log("\n📦 Migrating Account collection...");
  const accounts = await Account.find({}).lean();
  let migrated = 0;

  for (const account of accounts) {
    const update = {};
    
    if (account.currentBalance != null && account.currentBalancePaisa == null) {
      update.currentBalancePaisa = safeRupeesToPaisa(account.currentBalance);
    }

    if (Object.keys(update).length > 0) {
      await Account.updateOne({ _id: account._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${accounts.length} Account records`);
}

/**
 * Migrate BankAccount collection
 */
async function migrateBankAccount() {
  console.log("\n📦 Migrating BankAccount collection...");
  const bankAccounts = await BankAccount.find({}).lean();
  let migrated = 0;

  for (const bankAccount of bankAccounts) {
    const update = {};
    
    if (bankAccount.balance != null && bankAccount.balancePaisa == null) {
      update.balancePaisa = safeRupeesToPaisa(bankAccount.balance);
    }

    if (Object.keys(update).length > 0) {
      await BankAccount.updateOne({ _id: bankAccount._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${bankAccounts.length} BankAccount records`);
}

/**
 * Migrate Electricity collection
 */
async function migrateElectricity() {
  console.log("\n📦 Migrating Electricity collection...");
  const electricityRecords = await Electricity.find({}).lean();
  let migrated = 0;

  for (const record of electricityRecords) {
    const update = {};
    
    if (record.ratePerUnit != null && record.ratePerUnitPaisa == null) {
      update.ratePerUnitPaisa = safeRupeesToPaisa(record.ratePerUnit);
    }
    if (record.totalAmount != null && record.totalAmountPaisa == null) {
      update.totalAmountPaisa = safeRupeesToPaisa(record.totalAmount);
    }
    if (record.paidAmount != null && record.paidAmountPaisa == null) {
      update.paidAmountPaisa = safeRupeesToPaisa(record.paidAmount);
    }

    if (Object.keys(update).length > 0) {
      await Electricity.updateOne({ _id: record._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${electricityRecords.length} Electricity records`);
}

/**
 * Migrate Expense collection
 */
async function migrateExpense() {
  console.log("\n📦 Migrating Expense collection...");
  const expenses = await Expense.find({}).lean();
  let migrated = 0;

  for (const expense of expenses) {
    const update = {};
    
    if (expense.amount != null && expense.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(expense.amount);
    }

    if (Object.keys(update).length > 0) {
      await Expense.updateOne({ _id: expense._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${expenses.length} Expense records`);
}

/**
 * Migrate Revenue collection
 */
async function migrateRevenue() {
  console.log("\n📦 Migrating Revenue collection...");
  const revenues = await Revenue.find({}).lean();
  let migrated = 0;

  for (const revenue of revenues) {
    const update = {};
    
    if (revenue.amount != null && revenue.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(revenue.amount);
    }

    if (Object.keys(update).length > 0) {
      await Revenue.updateOne({ _id: revenue._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${revenues.length} Revenue records`);
}

/**
 * Migrate Security Deposit collection
 */
async function migrateSecurityDeposit() {
  console.log("\n📦 Migrating Security Deposit collection...");
  const deposits = await Sd.find({}).lean();
  let migrated = 0;

  for (const deposit of deposits) {
    const update = {};
    
    if (deposit.amount != null && deposit.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(deposit.amount);
    }

    if (Object.keys(update).length > 0) {
      await Sd.updateOne({ _id: deposit._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${deposits.length} Security Deposit records`);
}

/**
 * Migrate Maintenance collection
 */
async function migrateMaintenance() {
  console.log("\n📦 Migrating Maintenance collection...");
  const maintenanceRecords = await Maintenance.find({}).lean();
  let migrated = 0;

  for (const record of maintenanceRecords) {
    const update = {};
    
    if (record.amount != null && record.amountPaisa == null) {
      update.amountPaisa = safeRupeesToPaisa(record.amount);
    }
    if (record.paidAmount != null && record.paidAmountPaisa == null) {
      update.paidAmountPaisa = safeRupeesToPaisa(record.paidAmount);
    }

    if (Object.keys(update).length > 0) {
      await Maintenance.updateOne({ _id: record._id }, { $set: update });
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} of ${maintenanceRecords.length} Maintenance records`);
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log("🚀 Starting Paisa Migration...");
    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Run all migrations
    await migrateCam();
    await migratePayment();
    await migrateTransaction();
    await migrateAccount();
    await migrateBankAccount();
    await migrateElectricity();
    await migrateExpense();
    await migrateRevenue();
    await migrateSecurityDeposit();
    await migrateMaintenance();

    console.log("\n✅ Migration completed successfully!");
    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("1. Old rupee fields are kept for backward compatibility");
    console.log("2. All new records will use paisa fields");
    console.log("3. After confirming everything works, you can remove old fields in a future migration");
    console.log("4. Test all payment flows before removing backward compatibility");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log("\n✨ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { runMigration };
