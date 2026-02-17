import { Sd } from "./sd.model.js";
import { ledgerService } from "../ledger/ledger.service.js";
import { buildSecurityDepositJournal } from "../ledger/journal-builders/index.js";
import { createLiability } from "../liabilities/liabilty.service.js";
import { rupeesToPaisa } from "../../utils/moneyUtil.js";

export async function createSd(sdData, createdBy, session = null) {
  try {
    // ✅ Convert to paisa if needed
    if (!sdData.amountPaisa && sdData.amount) {
      sdData.amountPaisa = rupeesToPaisa(sdData.amount);
    }
    
    // Mongoose create() with a session requires an array of documents
    const opts = session ? { session } : {};
    const created = await Sd.create([sdData], opts);
    const sd = created[0];
    await sd.populate("tenant", "name");
    const sdPayload = buildSecurityDepositJournal(sd, { createdBy });
    await ledgerService.postJournalEntry(sdPayload, session);

    // ✅ Use paisa for liability creation
    const amountPaisa = sd.amountPaisa || (sd.amount ? rupeesToPaisa(sd.amount) : 0);
    await createLiability({
      source: "SECURITY_DEPOSIT",
      amountPaisa: amountPaisa,
      amount: amountPaisa / 100, // Backward compatibility
      date: sd.paidDate,
      payeeType: "TENANT",
      tenant: sd.tenant,
      referenceType: "SECURITY_DEPOSIT",
      referenceId: sd._id,
      createdBy: createdBy,
    });
    return {
      success: true,
      message: "Sd created successfully",
      data: sd,
    };
  } catch (error) {
    console.error("Failed to create sd:", error);
    return {
      success: false,
      message: "Failed to create sd",
      error: error.message,
    };
  }
}
