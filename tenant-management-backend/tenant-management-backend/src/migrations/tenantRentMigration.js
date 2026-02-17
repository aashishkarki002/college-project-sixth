export async function migrateTenantFinancials() {
  const Tenant = mongoose.model("Tenant");

  console.log("🔄 Starting financial data migration...");

  const tenants = await Tenant.find({});
  let migrated = 0;

  for (const tenant of tenants) {
    // Convert existing rupee floats to paisa integers
    const updates = {
      tdsPaisa: rupeesToPaisa(tenant.tds || 0),
      rentalRatePaisa: rupeesToPaisa(tenant.rentalRate || 0),
      grossAmountPaisa: rupeesToPaisa(tenant.grossAmount || 0),
      totalRentPaisa: rupeesToPaisa(tenant.totalRent || 0),
      camChargesPaisa: rupeesToPaisa(tenant.camCharges || 0),
      netAmountPaisa: rupeesToPaisa(tenant.netAmount || 0),
      securityDepositPaisa: rupeesToPaisa(tenant.securityDeposit || 0),
      pricePerSqftPaisa: rupeesToPaisa(tenant.pricePerSqft || 0),
      camRatePerSqftPaisa: rupeesToPaisa(tenant.camRatePerSqft || 0),
      quarterlyRentAmountPaisa: rupeesToPaisa(tenant.quarterlyRentAmount || 0),
    };

    await Tenant.updateOne({ _id: tenant._id }, { $set: updates });

    migrated++;

    if (migrated % 100 === 0) {
      console.log(`✅ Migrated ${migrated} tenants...`);
    }
  }

  console.log(`🎉 Migration complete! ${migrated} tenants updated.`);

  // Verify migration
  const sample = await Tenant.findOne({}).lean();
  console.log("\n📊 Sample migrated record:");
  console.log("Total Rent (paisa):", sample.totalRentPaisa);
  console.log("Total Rent (rupees):", paisaToRupees(sample.totalRentPaisa));
  console.log("CAM (paisa):", sample.camChargesPaisa);
  console.log("CAM (rupees):", paisaToRupees(sample.camChargesPaisa));
}

/**
 * UPDATED RENT SCHEMA
 */
const rentSchemaUpdated = new mongoose.Schema(
  {
    // ... existing fields ...

    // Store as PAISA (integers)
    rentAmountPaisa: {
      type: Number,
      required: true,
      get: paisaToRupees,
    },

    paidAmountPaisa: {
      type: Number,
      default: 0,
      get: paisaToRupees,
    },

    tdsAmountPaisa: {
      type: Number,
      default: 0,
      get: paisaToRupees,
    },

    lateFee: {
      type: Number,
      default: 0,
      get: paisaToRupees,
    },

    // ... rest of schema ...
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

/**
 * DUAL COMPATIBILITY APPROACH (RECOMMENDED FOR GRADUAL MIGRATION)
 * Keep both fields during transition period
 */
const rentSchemaDualCompat = new mongoose.Schema({
  // NEW: Paisa (source of truth)
  rentAmountPaisa: { type: Number, required: true },

  // DEPRECATED: Rupees (for backward compatibility)
  rentAmount: {
    type: Number,
    get: function () {
      // Always compute from paisa
      return paisaToRupees(this.rentAmountPaisa);
    },
  },
});

/**
 * EXAMPLE: Creating a tenant with paisa values
 */
export async function createTenantWithPaisa(body) {
  const { pricePerSqft, leasedSquareFeet, camRatePerSqft } = body;

  // Convert input to paisa
  const pricePerSqftPaisa = rupeesToPaisa(pricePerSqft);
  const camRatePerSqftPaisa = rupeesToPaisa(camRatePerSqft);

  // Calculate in paisa (integer arithmetic)
  const grossAmountPaisa = pricePerSqftPaisa * leasedSquareFeet;
  const tdsPaisa = Math.round((grossAmountPaisa * 10) / 100);
  const totalRentPaisa = grossAmountPaisa - tdsPaisa;
  const camChargesPaisa = camRatePerSqftPaisa * leasedSquareFeet;
  const netAmountPaisa = totalRentPaisa + camChargesPaisa;

  const tenant = await Tenant.create({
    ...body,

    // Store as PAISA (integers - no floating point errors!)
    pricePerSqftPaisa,
    camRatePerSqftPaisa,
    grossAmountPaisa,
    tdsPaisa: tdsPaisa / leasedSquareFeet, // Per sqft
    totalRentPaisa,
    camChargesPaisa,
    netAmountPaisa,
  });

  console.log("✅ Tenant created with precise values:");
  console.log("   Total Rent:", formatMoney(tenant.totalRentPaisa)); // Rs. 27,272.73
  console.log("   Stored as:", tenant.totalRentPaisa, "paisa"); // 2727273

  return tenant;
}

export { tenantSchemaUpdated, rentSchemaUpdated, rentSchemaDualCompat };
