import { Router } from "express";
import { createUnit } from "./unit.controller.js";
import getUnits from "./unit.controller.js";
const router = Router();

router.post("/create", createUnit);
router.get("/get-units", getUnits);
export default router;
