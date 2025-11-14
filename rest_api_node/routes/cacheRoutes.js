import express from "express";
import { getTypeAuth, getCacheConfig, validateApiKey, getDomainIP, getNearestCache } from "../controllers/cacheController.js";
import { verifyApiKey } from "../middleware/auth.js";

const router = express.Router();

router.get("/type_auth", verifyApiKey, getTypeAuth);
router.get("/config", verifyApiKey, getCacheConfig);
router.get("/validate/api_key", verifyApiKey, validateApiKey);
router.get("/ip", verifyApiKey, getDomainIP);
router.get("/ip_cache/:ip", verifyApiKey, getNearestCache);

export default router;
