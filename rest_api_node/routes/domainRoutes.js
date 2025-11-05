import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDomains, createDomain, deleteDomain, addUrl, getUrls, createSession, getSessions, deleteSession } from "../controllers/domainController.js";

const router = express.Router();

router.use(requireAuth); // todas requieren autenticación

// Rutas de dominios
router.get("/", getDomains);
router.post("/", createDomain);
router.delete("/:domainId", deleteDomain);

// Rutas de URLs dentro de un dominio
router.post("/:domainId/urls", addUrl);
router.get("/:domainId/urls", getUrls);

// Rutas de sesiones dentro de un dominio
router.post("/:domainId/create_session", createSession);
router.get("/:domainId/sessions", getSessions);
router.delete("/:domainId/sessions/:sessionId", deleteSession);

export default router;
