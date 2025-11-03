import express from "express";
import { getTypeAuth, validateSession, getDomainIP } from "../controllers/cacheController.js";

const router = express.Router();

router.get("/type_auth", getTypeAuth);
router.get("/validate/session_id", validateSession);
router.get("/ip", getDomainIP);

export default router;
