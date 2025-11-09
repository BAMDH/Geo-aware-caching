import { db } from "../utils/firebase.js";
import crypto from "crypto";
import dns from "dns";
import { promisify } from "util"

const domainsRef = db.collection("domains");
const resolveTxtPromise = promisify(dns.resolveTxt); // Para usar async/await con DNS

// Generar el token TXT
function generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
}

// Agregar dominio //
// 1. Genera el token y guarda el dominio en la db
export async function addDomain(req, res) {
    try {
        const { domain, type_auth, cache_size, subdomains } = req.body;
        if (!domain || !type_auth) return res.status(400).json({ error: "Datos incompletos" });

        // Verificar si ya existe (sin importar si está verificado o no)
        const existing = await domainsRef.where("domain", "==", domain).get();
        if (!existing.empty) return res.status(400).json({ error: "Dominio ya registrado o en proceso de registro" });

        const verificationToken = generateVerificationToken();

        const newDomain = {
            domain: domain.toLowerCase(),
            type_auth,
            cache_size: cache_size || -1,
            subdomains: subdomains || [],
            userId: req.user.id,
            createdAt: new Date(),
            isVerified: false,
            verificationToken: verificationToken,
            //verificationHost: "_check_dns",
        };

        const docRef = await domainsRef.add(newDomain);

        // Devuelve el token y el ID para que la UI pueda mostrar las instrucciones
        res.status(201).json({
            id: docRef.id,
            verificationToken: verificationToken,
            //verificationHost: newDomain.verificationHost,
            message: "Dominio guardado. Por favor, realice la verificación DNS."
        });

    } catch (error) {
        console.error("Error al iniciar registro de dominio:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// 2. Realiza la verificación del registro TXT
export async function verifyDomain(req, res) {
    try {
        const { domainId } = req.params;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        const { domain, verificationToken, /*verificationHost,*/ isVerified } = domainDoc.data();

        if (isVerified) {
            return res.status(200).json({ message: "Dominio ya verificado." });
        }

        //const hostnameToQuery = `${verificationHost}.${domain}`;

        let dnsRecords;
        try {
            // Realizar la consulta DNS pública (el 'lookup')
            dnsRecords = await resolveTxtPromise(domain);
        } catch (dnsError) {
            return res.status(400).json({ error: "El registro TXT aún no es visible públicamente o el hostname es incorrecto." });
        }

        // Buscar el token esperado en los registros TXT devueltos
        const foundToken = dnsRecords.flat().find(record => {
            const cleanRecord = record.replace(/"/g, '');

            return cleanRecord === verificationToken;
        });
        if (foundToken) {
            // Actualizar el estado en Firestore a verificado
            await domainsRef.doc(domainId).update({
                isVerified: true,
                verifiedAt: new Date(),
            });
            return res.json({ message: "¡Dominio verificado exitosamente! Ahora está activo." });

        } else {
            return res.status(400).json({ error: "Token TXT encontrado pero no coincide. Verifique el valor del registro." });
        }

    } catch (error) {
        console.error("Error al verificar dominio:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
}

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

        const domainData = domainDoc.data();
        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Complete la validación TXT antes de agregar URLs." });
        }

        const urlsRef = domainsRef.doc(domainId).collection("urls");
        await urlsRef.add({ url, ttl, file_types, cache_policy });
        res.status(201).json({ message: "URL agregada correctamente" });
    } catch (error) {
        console.error("Error al agregar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Obtener URLs de un dominio
export async function getUrls(req, res) {
    try {
        const { domainId } = req.params;
        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists) return res.status(404).json({ error: "Dominio no encontrado" });

        if (!domainDoc.data().isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. No se pueden ver las URLs." });
        }

        const urlsSnap = await domainsRef.doc(domainId).collection("urls").get();
        const urls = urlsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(urls);
    } catch (error) {
        console.error("Error al obtener URLs:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// TODO: delete url

// TODO: ver si es mejor usar apikey
// Crear session_id para un dominio
export async function createSession(req, res) {
    try {
        const { domainId } = req.params;
        const { user } = req.body;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists)
            return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = domainDoc.data();

        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Complete la validación TXT para crear sesiones." });
        }

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

// Obtener sesiones activas de un dominio
export async function getSessions(req, res) {
    try {
        const { domainId } = req.params;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists) return res.status(404).json({ error: "Dominio no encontrado" });

        if (!domainDoc.data().isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. No se pueden ver las sesiones." });
        }

        const sessionsSnap = await domainsRef.doc(domainId).collection("sessions").get();
        const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(sessions);
    } catch (error) {
        console.error("Error al obtener sesiones:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar una sesión
export async function deleteSession(req, res) {
    try {
        const { domainId, sessionId } = req.params;
        await domainsRef.doc(domainId).collection("sessions").doc(sessionId).delete();
        res.json({ message: "Sesión eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar sesión:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}