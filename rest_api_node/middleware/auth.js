import { verificarToken } from "../utils/jwt.js";
import { db } from "../utils/firebase.js";
const apiKeysRef = db.collection("zonal_cache").doc("api_keys");

export function requireAuth(req, res, next) {
    let token = req.cookies.auth_token;
    if (!token) {
        // Si no está en cookies se busca en header Authorization
        const authHeader = req.headers['authorization'];
        const headerToken = authHeader && authHeader.split(' ')[1];
        token = token || headerToken;
    }

    if (!token) {
        return res.status(403).send({ message: 'Se requiere un token para la autenticación.' });
    }
    try {
        const decoded = verificarToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: "Token inválido o expirado" });
    }
}

export const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['cache-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: "Acceso no autorizado." });
    }

    try {
        const apiKeysDoc = await apiKeysRef.get();
        if (!apiKeysDoc.exists) {
            console.warn("Documento 'zonal_cache/api_keys' no encontrado.");
            return res.status(500).json({ error: "Configuración de servicio interna faltante." });
        }

        const keyData = apiKeysDoc.data();
        const validKeys = Object.values(keyData);
        const isValid = validKeys.includes(apiKey);

        if (!isValid) {
            return res.status(403).json({ error: "Acceso denegado." });
        }

        next();
    } catch (error) {
        console.error("Error al verificar clave de servicio interna:", error);
        return res.status(500).json({ error: "Error interno del servidor al verificar la clave." });
    }
};