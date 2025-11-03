import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDomains, createDomain, deleteDomain, addUrl, createSession } from "../controllers/domainController.js";

const router = express.Router();

router.use(requireAuth); // todas requieren autenticación
router.get("/", getDomains);
router.post("/", createDomain);
router.delete("/:domainId", deleteDomain);
router.post("/:domainId/urls", addUrl);
router.post("/:domainId/create_session", createSession);

export default router;
