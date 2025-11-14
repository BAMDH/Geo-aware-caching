import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
    getDomains, getDomainById, addDomain, verifyDomain, updateDomain, deleteDomain,
    addUrl, getUrls, updateUrl, deleteUrl,
    createApiKey, getApiKeys, deleteApiKey,
    createUserPass, getUserPass, deleteUserPass
} from "../controllers/domainController.js";
const router = express.Router();

router.use(requireAuth); // todas requieren autenticación

// Rutas de dominios
router.get("/", getDomains);
router.get("/:domainId", getDomainById);
router.post("/", addDomain);
router.post("/:domainId/verify", verifyDomain);
router.put("/:domainId", updateDomain);
router.delete("/:domainId", deleteDomain);

// Rutas de URLs dentro de un dominio
router.post("/:domainId/urls", addUrl);
router.get("/:domainId/urls", getUrls);
router.put("/:domainId/urls/:urlId", updateUrl);
router.delete("/:domainId/urls/:urlId", deleteUrl);

// Rutas de API Keys
router.post("/:domainId/api-keys", createApiKey);
router.get('/:domainId/api-keys', getApiKeys);
router.post("/api-keys/delete", deleteApiKey);

// Rutas de User Pass
router.post("/:domainId/userpass", createUserPass);
router.get('/:domainId/userpass', getUserPass);
router.delete("/:domainId/userpass", deleteUserPass);


export default router;
