import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./modules/auth/auth.route.js";
import propertyRoute from "./modules/property/property.route.js";
import tenantRoute from "./modules/tenant/tenant.route.js";
import rentRoute from "./modules/rents/rent.route.js";
import bankRoute from "./modules/banks/bank.route.js";
import unitRoute from "./modules/units/unit.route.js";
import notificationRoute from "./modules/notifications/notification.route.js";
import paymentRoute from "./modules/payment/payment.route.js";
import ledgerRoute from "./modules/ledger/ledger.route.js";
import { connectDB } from "./config/db.js";
import revenueRoute from "./modules/revenue/revenue.route.js";
import accountingRoute from "./modules/accounting/accounting.route.js";
import dashboardRoute from "./modules/dashboards/dashboard.route.js";
import electricityRoute from "./modules/electricity/electricity.route.js";
import camRoute from "./modules/cam/cam.route.js";
import expenseRoute from "./modules/expenses/expense.route.js";
import maintenanceRoute from "./modules/maintenance/maintenance.route.js";
import staffRoute from "./modules/staffs/staffs.route.js";
import broadcastRoute from "./modules/broadcasts/broadcast.route.js";

// Load cron jobs asynchronously (no top-level await — required for cPanel/LiteSpeed which uses require())
function loadCronJobs() {
  import("./cron/monthlyRentAndCam.cron.js")
    .then(() => import("./cron/monthlyEmail.cron.js"))
    .then(() => console.log("✅ Cron jobs loaded"))
    .catch((err) => console.error("❌ Error loading cron jobs:", err));
}
loadCronJobs();

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use(cookieParser());
app.use(express.json());

/* -------------------- ROUTES -------------------- */
app.use("/api/auth", authRoute);
app.use("/api/property", propertyRoute);
app.use("/api/tenant", tenantRoute);
app.use("/api/rent", rentRoute);
app.use("/api/bank", bankRoute);
app.use("/api/unit", unitRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/ledger", ledgerRoute);
app.use("/api/revenue", revenueRoute);
app.use("/api/accounting", accountingRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/electricity", electricityRoute);
app.use("/api/cam", camRoute);
app.use("/api/expense", expenseRoute);
app.use("/api/maintenance", maintenanceRoute);
app.use("/api/staff", staffRoute);
app.use("/api/broadcast", broadcastRoute);
/* -------------------- HEALTH CHECK -------------------- */
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* -------------------- DB CONNECT -------------------- */
connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

export default app;
