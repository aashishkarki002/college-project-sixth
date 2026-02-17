import { getRentsService } from "./rent.service.js";
import handleMonthlyRents from "./rent.service.js";
import { sendEmailToTenants } from "./rent.service.js";

export async function getRentsController(req, res) {
  try {
    const result = await getRentsService();
    return res.status(200).json({
      success: result.success,
      rents: result.rents || [],
      message: result.message || "Rents fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Rents fetching failed",
      error: error.message,
    });
  }
}
export async function processMonthlyRents(req, res) {
  try {
    const result = await handleMonthlyRents(req.admin?.id);

    res.status(200).json({
      success: result.success,
      message: result.message,
      createdCount: result.createdCount || 0,
      updatedOverdueCount: result.updatedOverdueCount || 0,
      error: result.error || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Monthly rent processing failed",
      error: error.message,
    });
  }
}
export async function sendEmailToTenantsController(req, res) {
  try {
    const result = await sendEmailToTenants();
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error.message,
    });
  }
}
