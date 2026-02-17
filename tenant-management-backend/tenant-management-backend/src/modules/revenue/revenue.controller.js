import { createRevenue, getRevenue, getAllRevenue, getRevenueSource } from "./revenue.service.js";
export async function createRevenueController(req, res) {
    try {
        const adminId = req.admin.id;
        const revenueData = {
            ...req.body,
            createdBy: adminId,
        };
        const result = await createRevenue(revenueData);
        res.status(201).json({
            success: result.success,
            message: result.message,
            revenue: result.data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
export async function getRevenueController(req, res) {
    try {
        const revenueId = req.params.id;
        const revenue = await getRevenue(revenueId);
        res.status(200).json({
            success: true,
            message: "Revenue fetched successfully",
            revenue: revenue,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
export async function getAllRevenueController(req, res) {
    try {
        const result = await getAllRevenue();
        res.status(200).json({
            success: result.success,
            message: result.message,
            revenue: result.data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message, });
    }
}
export async function getRevenueSourceController(req, res) {
    try {
        const result = await getRevenueSource();
        res.status(200).json({
            success: result.success,
            message: result.message,
            revenueSource: result.data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}