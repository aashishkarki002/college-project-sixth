import { Router } from "express";
import { protect } from "../../middleware/protect.js";
import { createCamController, getCamsController } from "./cam.controller.js";

const router = Router();

router.get("/get-cams", protect, getCamsController);
router.post("/create", protect, createCamController);

export default router;
