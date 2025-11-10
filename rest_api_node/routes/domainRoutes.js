import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
    getDomains, addDomain, verifyDomain, deleteDomain,
    addUrl, getUrls, updateUrl, deleteUrl,
    createApiKey, getApiKeys, deleteApiKey, verifyAccessApiKey
} from "../controllers/domainController.js";
const router = express.Router();

router.use(requireAuth); // todas requieren autenticación

// Rutas de dominios
router.get("/", getDomains);
router.post("/", addDomain);
router.post("/:domainId/verify", verifyDomain);
router.delete("/:domainId", deleteDomain);

// Rutas de URLs dentro de un dominio
router.post("/:domainId/urls", addUrl);
router.get("/:domainId/urls", getUrls);
router.put("/:domainId/urls/:urlId", updateUrl);
router.delete("/:domainId/urls/:urlId", deleteUrl);

// Rutas de API Keys
router.post("/:domainId/keys", createApiKey);
router.get("/:domainId/keys", getApiKeys);
router.delete("/keys/:apiKeyId", deleteApiKey);

export default router;
