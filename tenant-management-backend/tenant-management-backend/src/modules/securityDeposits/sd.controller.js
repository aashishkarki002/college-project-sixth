import { createSd } from "./sd.service.js";
export const createSdController = async (req, res) => {
    try {
        const sd = await createSd(req.body, req.admin?.id, null);
        res.status(201).json({ success: sd.success, message: sd.message, sd: sd.data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message, error: error });
    }
}
export { createSdController };