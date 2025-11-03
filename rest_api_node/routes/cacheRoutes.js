import express from "express";
import { getTypeAuth, validateApiKey, validateSession, getDomainIP } from "../controllers/cacheController.js";

const router = express.Router();

router.get("/type_auth", getTypeAuth);
router.get("/validate/api_key", validateApiKey);
router.get("/validate/session_id", validateSession);
router.get("/ip", getDomainIP);

export default router;
