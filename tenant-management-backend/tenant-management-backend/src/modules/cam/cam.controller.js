import { createCam, getCams } from "./cam.service.js";

export const createCamController = async (req, res) => {
  try {
    const cam = await createCam(req.body, req.admin?.id, null);
    res.status(201).json({ success: true, message: "Cam created successfully", cam });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Cam creation failed", error: error });
  }
};

export const getCamsController = async (req, res) => {
  try {
    const { nepaliMonth, nepaliYear } = req.query;
    const filters = {};
    if (nepaliMonth != null) filters.nepaliMonth = Number(nepaliMonth);
    if (nepaliYear != null) filters.nepaliYear = Number(nepaliYear);
    const cams = await getCams(filters);
    res.status(200).json({ success: true, cams });
  } catch (error) {
    console.error("Get CAMs failed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch CAMs", error: error.message });
  }
};

