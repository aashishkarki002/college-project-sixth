import { createLiability } from "./liabilty.service.js";
export async function createLiabilityController(req, res) {
    try {
        const adminId = req.admin.id;
        const liabilityData = {
            ...req.body,
            createdBy: adminId,
        };
        const result = await createLiability(liabilityData);
        res.status(201).json({ success: result.success, message: result.message, liability: result.data });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}