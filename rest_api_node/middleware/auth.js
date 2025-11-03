import { verificarToken } from "../utils/jwt.js";

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
