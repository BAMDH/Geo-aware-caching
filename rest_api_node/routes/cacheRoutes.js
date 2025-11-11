import express from "express";
import { getTypeAuth, getCacheConfig, validateApiKey, getDomainIP, getNearestCache } from "../controllers/cacheController.js";

const router = express.Router();

router.get("/type_auth", getTypeAuth);
router.get("/config", getCacheConfig);
router.get("/validate/api_key", validateApiKey);
router.get("/ip", getDomainIP);
router.get("/ip_cache/:ip", getNearestCache);

export default router;
