/**
 * DIAGNOSTIC SCRIPT: Find where paisa values are being converted
 *
 * This will help identify if the problem is in:
 * 1. Rent Model schema (getters/setters)
 * 2. Pre-save hooks
 * 3. Virtuals
 * 4. Middleware
 */

import mongoose from "mongoose";
import { Rent } from "./modules/rents/rent.Model.js"; // Adjust path

async function diagnosePaisaConversion() {
  console.log("🔍 RENT MODEL DIAGNOSIS\n");
  console.log("=".repeat(60));

  // 1. Check schema definition
  console.log("\n1️⃣  SCHEMA FIELD CONFIGURATION:");
  console.log("=".repeat(60));

  const schema = Rent.schema;
  const paisaFields = [
    "rentAmountPaisa",
    "tdsAmountPaisa",
    "paidAmountPaisa",
    "lateFeePaisa",
  ];

  for (const fieldName of paisaFields) {
    const path = schema.path(fieldName);
    if (path) {
      console.log(`\n📋 Field: ${fieldName}`);
      console.log(`   Type: ${path.instance}`);
      console.log(`   Has getter: ${!!path.getters.length}`);
      console.log(`   Has setter: ${!!path.setters.length}`);

      if (path.getters.length > 0) {
        console.log(`   ⚠️  WARNING: Getter found!`);
        console.log(
          `   Getter function:`,
          path.getters[0].toString().substring(0, 100) + "...",
        );
      }

      if (path.setters.length > 0) {
        console.log(`   ⚠️  WARNING: Setter found!`);
        console.log(
          `   Setter function:`,
          path.setters[0].toString().substring(0, 100) + "...",
        );
      }
    } else {
      console.log(`\n❌ Field: ${fieldName} - NOT FOUND IN SCHEMA`);
    }
  }

  // 2. Check toObject/toJSON settings
  console.log("\n\n2️⃣  SCHEMA SETTINGS:");
  console.log("=".repeat(60));
  console.log("toObject options:", schema.get("toObject"));
  console.log("toJSON options:", schema.get("toJSON"));

  // 3. Check for pre-save hooks
  console.log("\n\n3️⃣  PRE-SAVE HOOKS:");
  console.log("=".repeat(60));
  const preSaveHooks = schema.s.hooks._pres.get("save") || [];
  console.log(`Found ${preSaveHooks.length} pre-save hooks`);
  preSaveHooks.forEach((hook, idx) => {
    console.log(`\nHook ${idx + 1}:`);
    console.log(hook.fn.toString().substring(0, 200) + "...");
  });

  // 4. Test actual save behavior
  console.log("\n\n4️⃣  SAVE BEHAVIOR TEST:");
  console.log("=".repeat(60));

  const testData = {
    tenant: new mongoose.Types.ObjectId(),
    property: new mongoose.Types.ObjectId(),
    block: new mongoose.Types.ObjectId(),
    innerBlock: new mongoose.Types.ObjectId(),
    rentAmountPaisa: 2727273, // Test value
    tdsAmountPaisa: 272727,
    paidAmountPaisa: 0,
    status: "pending",
    nepaliMonth: 10,
    nepaliYear: 2082,
    englishMonth: 1,
    englishYear: 2026,
  };

  console.log("\n📥 Input data:");
  console.log("   rentAmountPaisa:", testData.rentAmountPaisa);
  console.log("   tdsAmountPaisa:", testData.tdsAmountPaisa);

  // Test 1: Create document
  const doc = new Rent(testData);

  console.log("\n📦 After new Rent():");
  console.log("   doc.rentAmountPaisa (with getters):", doc.rentAmountPaisa);
  console.log(
    '   doc.get("rentAmountPaisa", null, {getters: false}):',
    doc.get("rentAmountPaisa", null, { getters: false }),
  );

  // Test 2: toObject
  console.log("\n📄 After toObject():");
  const obj1 = doc.toObject({ getters: false });
  const obj2 = doc.toObject({ getters: true });
  console.log("   rentAmountPaisa (getters: false):", obj1.rentAmountPaisa);
  console.log("   rentAmountPaisa (getters: true):", obj2.rentAmountPaisa);

  // Test 3: Check what would be saved
  console.log("\n💾 What will be saved to DB:");
  const saveDoc = doc.toObject({
    depopulate: true,
    versionKey: false,
    getters: false, // Important!
  });
  console.log("   rentAmountPaisa:", saveDoc.rentAmountPaisa);
  console.log("   Type:", typeof saveDoc.rentAmountPaisa);
  console.log("   Is integer?", Number.isInteger(saveDoc.rentAmountPaisa));

  // Expected vs Actual
  console.log("\n✅ EXPECTED: 2727273");
  console.log("📊 ACTUAL:", saveDoc.rentAmountPaisa);
  console.log("❓ MATCH?", saveDoc.rentAmountPaisa === 2727273);

  if (saveDoc.rentAmountPaisa !== 2727273) {
    console.log("\n🚨 PROBLEM DETECTED!");
    console.log("   Expected: 2727273");
    console.log("   Got:", saveDoc.rentAmountPaisa);
    console.log("   Ratio:", (saveDoc.rentAmountPaisa / 2727273).toFixed(4));

    if (saveDoc.rentAmountPaisa === 27272.73) {
      console.log("\n   ❌ CONFIRMED: Getter is converting paisa → rupees!");
      console.log("   FIX: Remove getter from rentAmountPaisa field");
    } else if (saveDoc.rentAmountPaisa === 272727300) {
      console.log("\n   ❌ CONFIRMED: Setter is converting rupees → paisa!");
      console.log("   FIX: Remove setter from rentAmountPaisa field");
    }
  } else {
    console.log("\n✅ No problem detected in document creation");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🏁 DIAGNOSIS COMPLETE");
  console.log("=".repeat(60) + "\n");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnosePaisaConversion()
    .then(() => {
      console.log("\n👋 Done");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Diagnosis failed:", error);
      process.exit(1);
    });
}

export { diagnosePaisaConversion };
