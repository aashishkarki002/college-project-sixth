// scripts/seedExpenseSources.js
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import ExpenseSource from "../modules/expenses/ExpenseSource.Model.js";

const expenseSources = [
  {
    name: "Vendor",
    code: "VENDOR",
    category: "OPERATING",
    description: "Vendor payments and supplier expenses",
  },
  {
    name: "Maintenance",
    code: "MAINTENANCE",
    category: "OPERATING",
    description: "Building maintenance and repair expenses",
  },
  {
    name: "Utility",
    code: "UTILITY",
    category: "OPERATING",
    description: "Utility bills (electricity, water, gas, etc.)",
  },
  {
    name: "Salary",
    code: "SALARY",
    category: "OPERATING",
    description: "Employee salaries and wages",
  },
  {
    name: "Security Deposit Refund",
    code: "SECURITY_DEPOSIT_REFUND",
    category: "OPERATING",
    description: "Refunds of security deposits to tenants",
  },
  {
    name: "Office Supplies",
    code: "OFFICE_SUPPLIES",
    category: "OPERATING",
    description: "Office supplies and stationery",
  },
  {
    name: "Insurance",
    code: "INSURANCE",
    category: "OPERATING",
    description: "Property and liability insurance premiums",
  },
  {
    name: "Property Tax",
    code: "PROPERTY_TAX",
    category: "OPERATING",
    description: "Property tax payments",
  },
  {
    name: "Legal Fees",
    code: "LEGAL_FEES",
    category: "OPERATING",
    description: "Legal consultation and documentation fees",
  },
  {
    name: "Marketing & Advertising",
    code: "MARKETING",
    category: "OPERATING",
    description: "Marketing and advertising expenses",
  },
  {
    name: "Cleaning Services",
    code: "CLEANING",
    category: "OPERATING",
    description: "Professional cleaning services",
  },
  {
    name: "Landscaping",
    code: "LANDSCAPING",
    category: "OPERATING",
    description: "Landscaping and gardening expenses",
  },
  {
    name: "Loan Payment",
    code: "LOAN_PAYMENT",
    category: "NON_OPERATING",
    description: "Loan principal and interest payments",
  },
  {
    name: "Interest Expense",
    code: "INTEREST",
    category: "NON_OPERATING",
    description: "Interest on loans and borrowings",
  },
  {
    name: "Other Operating",
    code: "OTHER_OPERATING",
    category: "OPERATING",
    description: "Other operating expenses",
  },
  {
    name: "Other Non-Operating",
    code: "OTHER_NON_OPERATING",
    category: "NON_OPERATING",
    description: "Other non-operating expenses",
  },
];

async function seedExpenseSources() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    for (const source of expenseSources) {
      const exists = await ExpenseSource.findOne({ code: source.code });
      if (exists) {
        console.log(`⚠️  ${source.code} already exists — skipping`);
        continue;
      }

      await ExpenseSource.create(source);
      console.log(`✅ Created expense source: ${source.name} (${source.code})`);
    }

    console.log("🎉 Expense sources seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedExpenseSources();
