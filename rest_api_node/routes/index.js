import express from "express";
import { register, login } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Ejemplo de endpoint protegido con JWT
router.get("/profile", requireAuth, (req, res) => {
    res.json({ message: `Bienvenido, usuario ${req.user.id}` });
});


export default router;
