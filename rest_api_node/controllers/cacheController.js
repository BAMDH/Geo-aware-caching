import { db } from "../utils/firebase.js";

const domainsRef = db.collection("domains");

// Obtener tipo de autenticación
export async function getTypeAuth(req, res) {
    try {
        const { domain } = req.query;
        const snapshot = await domainsRef.where("domain", "==", domain).get();

        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const doc = snapshot.docs[0];
        const data = doc.data();
        res.json({ domain, subdomain: data.subdomain || "www", type_auth: data.type_auth });
    } catch (error) {
        console.error("Error en getTypeAuth:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Validar API Key
export async function validateApiKey(req, res) {
    try {
        const { domain, subdomain } = req.query;
        const apiKey = req.headers["client-api-key"];
        if (!apiKey) return res.status(400).json({ error: "Falta client-api-key" });

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const doc = snapshot.docs[0];
        const keysRef = domainsRef.doc(doc.id).collection("api_keys");
        const keySnap = await keysRef.where("key", "==", apiKey).get();

        res.json({ valid: !keySnap.empty });
    } catch (error) {
        console.error("Error en validateApiKey:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Validar Session ID
export async function validateSession(req, res) {
    try {
        const { domain } = req.query;
        const sessionId = req.headers["client-session-id"];
        if (!sessionId) return res.status(400).json({ error: "Falta client-session-id" });

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const doc = snapshot.docs[0];
        const sessionsRef = domainsRef.doc(doc.id).collection("sessions");
        const sessionSnap = await sessionsRef.where("session_id", "==", sessionId).get();

        res.json({ valid: !sessionSnap.empty });
    } catch (error) {
        console.error("Error en validateSession:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Obtener IP del subdominio
export async function getDomainIP(req, res) {
    try {
        const { domain, subdomain } = req.query;
        const snapshot = await domainsRef.where("domain", "==", domain).get();

        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const doc = snapshot.docs[0];
        const data = doc.data();
        res.json({ ip: data[subdomain]?.ip || data.ip || "0.0.0.0" });
    } catch (error) {
        console.error("Error en getDomainIP:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
