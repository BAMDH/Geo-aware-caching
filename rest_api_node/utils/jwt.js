import jwt from "jsonwebtoken";

export function generarToken(usuario) {
    return jwt.sign(
        { id: usuario.id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }
    );
}

export function verificarToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
}
