// scripts/seedRevenueSources.js
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { RevenueSource } from "../modules/revenue/RevenueSource.Model.js";

const revenueSources = [
  {
    name: "Rent",
    code: "RENT",
    category: "OPERATING",
    description: "Monthly tenant rent",
  },
  {
    name: "Parking",
    code: "PARKING",
    category: "OPERATING",
    description: "Vehicle parking charges",
  },
  {
    name: "Brand Advertisement",
    code: "BRAND_AD",
    category: "OPERATING",
    description: "Advertisement & brand endorsement income",
  },
  {
    name: "CAM Charges",
    code: "CAM",
    category: "OPERATING",
    description: "Common area maintenance charges",
  },
  {
    name: "Other Income",
    code: "OTHER",
    category: "NON_OPERATING",
    description: "Miscellaneous income",
  },
];

async function seedRevenueSources() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    for (const source of revenueSources) {
      const exists = await RevenueSource.findOne({ code: source.code });
      if (exists) {
        console.log(`⚠️  ${source.code} already exists — skipping`);
        continue;
      }

      await RevenueSource.create(source);
      console.log(`✅ Created revenue source: ${source.name}`);
    }

    console.log("🎉 Revenue sources seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedRevenueSources();
