import { Router } from "express";
import {
  sendBroadcastEmail,
  previewRecipients,
  getPlaceholders,
} from "./broadcast.controller.js";

const router = Router();

// Send broadcast email to filtered tenants
router.post("/send-email", sendBroadcastEmail);

// Preview recipients before sending
router.post("/preview-recipients", previewRecipients);

// Get available placeholders for email templates
router.get("/placeholders", getPlaceholders);

export default router;
