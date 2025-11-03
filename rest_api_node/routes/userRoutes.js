import express from "express";
import { register, login } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, (req, res) => {
    res.json({ id: req.user.id, user: req.user.user });
});

export default router;
