// scripts/seedLiabilitySources.js
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { LiabilitySource } from "../modules/liabilities/LiabilitesSource.Model.js";

const liabilitySources = [
  {
    name: "Vendor",
    code: "VENDOR",
    category: "OPERATING",
    description: "Vendor payments",
  },
  {
    name:"Security Deposit",
    code: "SECURITY_DEPOSIT",
    category: "OPERATING",
    description: "Security deposits",
  },
  {
    name: "Maintenance",
    code: "MAINTENANCE",
    category: "OPERATING",
    description: "Maintenance expenses",
  },
  {
    name: "Utility",
    code: "UTILITY",
    category: "OPERATING",
    description: "Utility expenses",
  },
  {
    name: "Other",
    code: "OTHER",
    category: "OPERATING",
    description: "Other expenses",
  },
  {
    name: "Salary",
    code: "SALARY",
    category: "OPERATING",
    description: "Employee salaries",
  },
  {
    name: "Refund",
    code: "REFUND",
    category: "OPERATING",
    description: "Refunds to tenants",
  },
  {
    name: "Loan",
    code: "LOAN",
    category: "NON_OPERATING",
    description: "Loan payments",
  },
];

async function seedLiabilitySources() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    for (const source of liabilitySources) {
      const exists = await LiabilitySource.findOne({ code: source.code });
      if (exists) {
        console.log(`⚠️  ${source.code} already exists — skipping`);
        continue;
      }

      await LiabilitySource.create(source);
      console.log(`✅ Created liability source: ${source.name}`);
    }

    console.log("🎉 Liability sources seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedLiabilitySources();
