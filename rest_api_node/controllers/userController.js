import bcrypt from "bcrypt";
import { generarToken } from "../utils/jwt.js";
import { db } from "../utils/firebase.js";

const usersRef = db.collection("users");

// Registro de usuario
export async function register(req, res) {
    try {
        const { user, password } = req.body;

        // Verificar si el usuario ya existe
        const existing = await usersRef.where("user", "==", user).get();
        if (!existing.empty) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        // Hashear contraseña
        const hashed = await bcrypt.hash(password, 10);

        // Crear documento en Firestore
        const newUser = {
            user,
            password: hashed,
        };

        await usersRef.add(newUser); // Crea documento con un id aleatorio

        res.status(201).json({ message: "Usuario registrado correctamente" });
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Login de usuario
export async function login(req, res) {
    try {
        const { user, password } = req.body;

        // Buscar usuario
        const snapshot = await usersRef.where("user", "==", user).get();
        if (snapshot.empty)
        return res.status(404).json({ error: "Usuario no encontrado" });

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Validar contraseña
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

        // Generar token JWT
        const token = generarToken({
        id: userDoc.id,
        user: userData.user,
        });

        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
        // Envia el token como HTTP-Only Cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 3600000 // 1 hora
        });

        res.json({ message: "Login exitoso, token almacenado en cookie." });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
