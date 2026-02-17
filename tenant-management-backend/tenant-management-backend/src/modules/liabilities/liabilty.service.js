import { Liability } from "./Liabilities.Model.js";
import { LiabilitySource } from "./LiabilitesSource.Model.js";
import Admin from "../auth/admin.Model.js";
import mongoose from "mongoose";

async function createLiability(liabilityData) {
  try {
    const {
      source,
      amount,
      date,
      payeeType,
      tenant,
      referenceType,
      referenceId,
      status,
      notes,
      createdBy,
    } = liabilityData;

    // Accept either ObjectId or source code (e.g., "SECURITY_DEPOSIT")
    const isObjectId = mongoose.Types.ObjectId.isValid(source);
    const liabilitySource = isObjectId
      ? await LiabilitySource.findById(source)
      : await LiabilitySource.findOne({ code: source });

    if (!liabilitySource) {
      throw new Error("Liability source not found");
    }

    const existingAdmin = await Admin.findById(createdBy);
    if (!existingAdmin) {
      throw new Error("Admin not found");
    }

    const liability = await Liability.create({
      source: liabilitySource._id,
      amount,
      date,
      payeeType,
      tenant,
      referenceType,
      referenceId,
      status,
      notes,
      createdBy,
    });

    return {
      success: true,
      message: "Liability created successfully",
      data: liability,
    };
  } catch (error) {
    console.error("Failed to create liability:", error);
    return {
      success: false,
      message: "Failed to create liability",
      error: error.message,
    };
  }
}

export { createLiability };