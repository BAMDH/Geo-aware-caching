import { db } from "../utils/firebase.js";
import crypto from "crypto";

const domainsRef = db.collection("domains");

// Obtener dominios de un usuario
export async function getDomains(req, res) {
    try {
        const snapshot = await domainsRef.where("userId", "==", req.user.id).get();
        const domains = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(domains);
    } catch (error) {
        console.error("Error al obtener dominios:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Crear dominio
export async function createDomain(req, res) {
    try {
        const { domain, type_auth, cache_size } = req.body;
        if (!domain || !type_auth) return res.status(400).json({ error: "Datos incompletos" });

        // Verificar si ya existe
        const existing = await domainsRef.where("domain", "==", domain).get();
        if (!existing.empty) return res.status(400).json({ error: "Dominio ya registrado" });

        const newDomain = {
            domain,
            type_auth,
            cache_size: cache_size || 100,
            userId: req.user.id,
            createdAt: new Date(),
        };

        await domainsRef.add(newDomain);
        res.status(201).json({ message: "Dominio creado correctamente" });
    } catch (error) {
        console.error("Error al crear dominio:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

  // Eliminar dominio
export async function deleteDomain(req, res) {
    try {
        const { domainId } = req.params;
        await domainsRef.doc(domainId).delete();
        res.json({ message: "Dominio eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar dominio:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Agregar URL a dominio
export async function addUrl(req, res) {
    try {
        const { domainId } = req.params;
        const { url, ttl, file_types, cache_policy } = req.body;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists) return res.status(404).json({ error: "Dominio no encontrado" });

        const urlsRef = domainsRef.doc(domainId).collection("urls");
        await urlsRef.add({ url, ttl, file_types, cache_policy });
        res.status(201).json({ message: "URL agregada correctamente" });
    } catch (error) {
        console.error("Error al agregar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Crear session_id para un dominio (solo si usa session_id)
export async function createSession(req, res) {
    try {
        const { domainId } = req.params;
        const { user } = req.body;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists)
            return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = domainDoc.data();
        if (domainData.type_auth !== "session_id")
            return res.status(400).json({ error: "Este dominio no usa session_id" });

        const session_id = crypto.randomBytes(24).toString("hex");
        const newSession = {
            session_id,
            user,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        };

        await domainsRef.doc(domainId).collection("sessions").add(newSession);

        res.status(201).json({
            message: "Sesión creada correctamente",
            session_id,
            expiresAt: newSession.expiresAt,
        });
    } catch (error) {
        console.error("Error al crear sesión:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
