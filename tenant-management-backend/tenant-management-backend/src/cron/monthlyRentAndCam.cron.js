import cron from "node-cron";
import { CronLog } from "./model/CronLog.js";
import handleMonthlyRents from "../modules/rents/rent.service.js";
import { checkNepaliSpecialDays } from "../utils/nepaliDateHelper.js";
import { handleMonthlyCams } from "../modules/cam/cam.service.js";

export async function monthlyRentAndCamCron() {
  try {
    console.log("🔄 Monthly rent cron started at:", new Date().toISOString());
    const { isFirstDay } = checkNepaliSpecialDays({ forceTest: true });
    console.log("📅 isFirstDay check result:", isFirstDay);
    if (!isFirstDay) {
      console.log("⏭️ Skipping execution - not first day of month");
      return;
    }
    console.log("✅ Proceeding with rent and CAM processing...");

    const rentResult = await handleMonthlyRents(); // no req in cron; service uses SYSTEM_ADMIN_ID fallback
    const camResult = await handleMonthlyCams();
    console.log(" Cron Result:", rentResult, camResult);

    await CronLog.create({
      type: "MONTHLY_RENT",
      ranAt: new Date(),
      message: rentResult.message,
      count: rentResult.count || 0,
      success: rentResult.success,
      error: rentResult.error ? rentResult.error.toString() : null,
    });
    await CronLog.create({
      type: "MONTHLY_CAM",
      ranAt: new Date(),
      message: camResult.message,
      count: camResult.count || 0,
      success: camResult.success,
      error: camResult.error ? camResult.error.toString() : null,
    });

    console.log(" Cron result saved to database");
  } catch (error) {
    console.error(" Monthly Rent Cron Error:", error);

    await CronLog.create({
      type: "MONTHLY_RENT",
      ranAt: new Date(),
      message: "Cron failed",
      count: 0,
      success: false,
      error: error.toString(),
    });
  }
}

// Schedule cron job to run every 10 seconds (for testing)
// In production, change to: "0 0 1 * * *" to run on the 1st day of each month at midnight
const cronJob = cron.schedule(
  "0 0 1 * * *",
  async () => {
    console.log("⏰ Cron job triggered at:", new Date().toISOString());
    try {
      await monthlyRentAndCamCron();
    } catch (error) {
      console.error("❌ Unhandled error in cron job:", error);
    }
  },
  {
    timezone: "Asia/Kathmandu",
    scheduled: true,
  }
);

console.log(
  "✅ Monthly rent and cam cron job scheduled (runs every 10 seconds, executes only on first day of Nepali month)"
);
console.log("📅 Current NODE_ENV:", process.env.NODE_ENV || "not set");
