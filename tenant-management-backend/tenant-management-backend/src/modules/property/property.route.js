import { Router } from "express";
import createBlock from "../blocks/block.controller.js";
import createInnerBlock from "../blocks/innerBlocks/innerBlock.controller.js";
import getProperty from "./property.controller.js";
import createProperty from "./property.controller.js";

import { protect } from "../../middleware/protect.js";
const router = Router();
router.get("/get-property", protect, getProperty);
router.post("/create-property", protect, createProperty);
router.post("/create-block", protect, createBlock);
router.post("/create-inner-block", protect, createInnerBlock);
export default router;
