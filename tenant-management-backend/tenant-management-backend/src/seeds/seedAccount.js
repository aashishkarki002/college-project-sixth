import dotenv from "dotenv";
dotenv.config();

import { Account } from "../modules/ledger/accounts/Account.Model.js";
import { connectDB } from "../config/db.js";
import { fileURLToPath } from "url";

/**
 * Seed initial chart of accounts
 * Run this once to set up the accounting structure
 */
export async function seedAccounts() {
  try {
    await connectDB();
    const accounts = [
      // ASSETS
      {
        code: "1000",
        name: "Bank Account",
        type: "ASSET",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description:
          "Bank accounts for all transactions (bank transfer & cheque)",
      },
      {
        code: "1200",
        name: "Accounts Receivable - Tenants",
        type: "ASSET",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Money owed by tenants for rent",
      },

      // LIABILITIES
      {
        code: "2000",
        name: "Accounts Payable",
        type: "LIABILITY",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Money owed to vendors and suppliers",
      },
      {
        code: "2100",
        name: "Security Deposits",
        type: "LIABILITY",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Tenant security deposits held",
      },

      // EQUITY
      {
        code: "3000",
        name: "Owner's Equity",
        type: "EQUITY",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Owner's investment in the business",
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "EQUITY",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Accumulated profits",
      },

      // REVENUE
      {
        code: "4000",
        name: "Rental Income",
        type: "REVENUE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Income from property rentals",
      },
      {
        code: "4100",
        name: "Other Income",
        type: "REVENUE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Additional revenue streams (parking, amenities, etc.)",
      },
      {
        code: "4200",
        name: "Late Fee Income",
        type: "REVENUE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Income from late payment fees",
      },

      // EXPENSES
      {
        code: "5000",
        name: "Maintenance & Repairs",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Property maintenance and repair costs",
      },
      {
        code: "5100",
        name: "Utilities",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Water, electricity, gas expenses",
      },
      {
        code: "5200",
        name: "Property Management Fees",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Fees paid for property management",
      },
      {
        code: "5300",
        name: "Insurance",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Property insurance expenses",
      },
      {
        code: "5400",
        name: "Property Tax",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "Property tax expenses",
      },
      {
        code: "5500",
        name: "Administrative Expenses",
        type: "EXPENSE",
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        description: "General administrative costs",
      },
    ];

    for (const accountData of accounts) {
      const existing = await Account.findOne({ code: accountData.code });
      if (!existing) {
        await Account.create(accountData);
        console.log(
          `✓ Created account: ${accountData.code} - ${accountData.name}`
        );
      } else {
        console.log(
          `- Account exists: ${accountData.code} - ${accountData.name}`
        );
      }
    }

    console.log("\n✓ Chart of accounts seeded successfully!");
    return { success: true, message: "Accounts seeded successfully" };
  } catch (error) {
    console.error("Error seeding accounts:", error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
const currentFile = __filename.replace(/\\/g, "/");
const runFile = process.argv[1]?.replace(/\\/g, "/");

// Check if this file is being run directly
if (currentFile === runFile || import.meta.url.includes(runFile)) {
  (async () => {
    try {
      await seedAccounts();
      process.exit(0);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  })();
}
