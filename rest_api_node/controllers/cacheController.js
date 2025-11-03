import { db } from "../utils/firebase.js";

const domainsRef = db.collection("domains");

// Obtener tipo de autenticación
export async function getTypeAuth(req, res) {
    try {
        const { domain } = req.query;
        if (!domain) return res.status(400).json({ error: "Falta domain" });

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = snapshot.docs[0].data();
        res.json({
            domain: domainData.domain,
            type_auth: domainData.type_auth,
        });
    } catch (error) {
        console.error("Error en getTypeAuth:", error);
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
        const sessionSnap = await sessionsRef
            .where("session_id", "==", sessionId)
            .where("expiresAt", ">", new Date())
            .get();

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

// Obtener IP de un dominio
export async function getDomainIP(req, res) {
    try {
        const { domain } = req.query;
        if (!domain) return res.status(400).json({ error: "Falta domain" });

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty)
            return res.status(404).json({ error: "Dominio no encontrado" });

        const data = snapshot.docs[0].data();
        res.json({ domain: data.domain, ip: data.ip });
    } catch (error) {
        console.error("Error al obtener IP:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

