import { Tenant } from "../tenant/Tenant.Model.js";
import { Block } from "../blocks/Block.Model.js";
import { Rent } from "../rents/rent.Model.js";
import { Unit } from "../units/Unit.Model.js";
import {
  getNepaliMonthDates,
  addNepaliDays,
} from "../../utils/nepaliDateHelper.js";
import { Revenue } from "../revenue/Revenue.Model.js";
import { Maintenance } from "../maintenance/Maintenance.Model.js";

/**
 * Fetches dashboard stats (Nepali-date-based). Use this when you need the data
 * without sending an HTTP response (e.g. from payment controller).
 */
export async function getDashboardStatsData() {
  const {
    firstDayDate,
    lastDayEndDate,
    nepaliToday,
    nepaliTodayDate,
    npYear,
    npMonth,
  } = getNepaliMonthDates();

  /* ===============================
     1️⃣ TENANT & UNIT STATS (Nepali month)
  =============================== */

  const [
    totalTenants,
    activeTenants,
    tenantsThisMonth,
    totalUnits,
    occupiedUnits,
  ] = await Promise.all([
    Tenant.countDocuments({ isDeleted: false }),
    Tenant.countDocuments({ isDeleted: false, status: "active" }),
    Tenant.countDocuments({
      isDeleted: false,
      $or: [
        { createdAt: { $gte: firstDayDate, $lt: lastDayEndDate } },
        { dateOfAgreementSigned: { $gte: firstDayDate, $lt: lastDayEndDate } },
      ],
    }),
    Unit.countDocuments(),
    Unit.countDocuments({ isOccupied: true }),
  ]);

  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  /* ===============================
       2️⃣ RENT SUMMARY
    =============================== */

  const [rentAgg, revenueAgg] = await Promise.all([
    Rent.aggregate([
      {
        $project: {
          rentAmount: 1,
          paidAmount: 1,
          remaining: {
            $max: [{ $subtract: ["$rentAmount", "$paidAmount"] }, 0],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$paidAmount" },
          totalRent: { $sum: "$rentAmount" },
          totalOutstanding: { $sum: "$remaining" },
        },
      },
    ]),

    Revenue.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]),
  ]);
  const rentSummary = rentAgg[0] || {};
  const revenueSummary = revenueAgg[0] || {};

  /* ===============================
       3️⃣ OVERDUE RENTS (TOP 3) – due before Nepali today
    =============================== */

  const overdueRents = await Rent.find({
    nepaliDueDate: { $lt: nepaliTodayDate },
    $expr: {
      $gt: [{ $subtract: ["$rentAmount", "$paidAmount"] }, 0],
    },
  })
    .populate("tenant", "name")
    .populate("property", "name")
    .select("tenant property rentAmount paidAmount nepaliDueDate status")
    .sort({ nepaliDueDate: 1 })
    .limit(3)
    .lean()
    .then((rents) =>
      rents.map((rent) => ({
        ...rent,
        remaining: rent.rentAmount - rent.paidAmount,
      }))
    );

  const maintenance = await Maintenance.find({
    status: "OPEN",
  })
    .limit(3)
    .lean();

  const nepaliUpcomingEnd = addNepaliDays(nepaliToday, 7);
  const upcomingEndDate = nepaliUpcomingEnd.getDateObject();

  const upcomingRents = await Rent.find({
    nepaliDueDate: {
      $gte: nepaliTodayDate,
      $lte: upcomingEndDate,
    },
    $expr: {
      $gt: [{ $subtract: ["$rentAmount", "$paidAmount"] }, 0],
    },
  })
    .populate("tenant", "name")
    .populate("property", "name")
    .select("tenant property rentAmount paidAmount nepaliDueDate status")
    .sort({ nepaliDueDate: 1 })
    .limit(3)
    .lean()
    .then((rents) =>
      rents.map((rent) => {
        return {
          ...rent,
          remaining: rent.rentAmount - rent.paidAmount,
        };
      })
    );

  /* ===============================
       5️⃣ CONTRACTS ENDING SOON (30 NEPALI DAYS)
    =============================== */

  const nepali30DaysLater = addNepaliDays(nepaliToday, 30);
  const leaseEndLimitDate = nepali30DaysLater.getDateObject();

  const contractsEndingSoon = await Tenant.find({
    isDeleted: false,
    status: "active",
    leaseEndDate: {
      $gte: nepaliTodayDate,
      $lte: leaseEndLimitDate,
    },
  })
    .select("name leaseEndDate")
    .sort({ leaseEndDate: 1 })
    .limit(3)
    .lean()
    .then((tenants) =>
      tenants.map((tenant) => {
        const endDate = new Date(tenant.leaseEndDate);
        const daysUntilEnd = Math.ceil(
          (endDate - nepaliTodayDate) / (1000 * 60 * 60 * 24)
        );

        return {
          ...tenant,
          daysUntilEnd,
        };
      })
    );

  /* ===============================
     6️⃣ RESPONSE DATA
  =============================== */

  return {
    success: true,
    message: "Dashboard stats fetched successfully",
    data: {
      totalTenants,
      activeTenants,
      tenantsThisMonth,
      totalUnits,
      occupiedUnits,
      occupancyRate,

      rentSummary: {
        totalCollected: rentSummary.totalCollected || 0,
        totalRent: rentSummary.totalRent || 0,
        totalOutstanding: rentSummary.totalOutstanding || 0,
      },

      totalRevenue: revenueSummary.totalRevenue || 0,

      overdueRents,
      upcomingRents,
      maintenance,
      contractsEndingSoon,
      nepaliToday: nepaliToday.toString(),
      npYear,
      npMonth,
    },
  };
}

export async function getDashboardStats(req, res) {
  try {
    const result = await getDashboardStatsData();
    res.json(result);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
}
