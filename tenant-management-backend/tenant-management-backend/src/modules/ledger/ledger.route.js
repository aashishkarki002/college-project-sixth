import { Router } from "express";
import { getLedger, getLedgerSummary, getTenantLedger, getAccountLedger } from "./ledger.controller.js";

const router = Router();

router.get("/get-ledger", getLedger);
router.get("/get-ledger-summary", getLedgerSummary);
router.get("/get-tenant-ledger", getTenantLedger);
router.get("/get-account-ledger", getAccountLedger);
export default router;
