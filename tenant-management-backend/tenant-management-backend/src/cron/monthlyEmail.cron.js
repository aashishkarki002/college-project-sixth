import cron from "node-cron";
import { sendEmailToTenants } from "../modules/rents/rent.service.js";

export async function monthlyEmailCron() {
  try {
    console.log(" Monthly email cron started");
    const result = await sendEmailToTenants();
    console.log(" Cron Result:", result);
  } catch (error) {
    console.error(" Monthly Email Cron Error:", error);
  }
}
const cronJob = cron.schedule("0 0 1 * * *", monthlyEmailCron, {
  timezone: "Asia/Kathmandu",
  scheduled: true,
});

console.log("✅ Monthly email cron job scheduled (runs every day at midnight)");
