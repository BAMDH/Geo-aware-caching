import { db } from "../utils/firebase.js";

import { verifyApiKey, verifyUserPass } from "./domainController.js";
const domainsRef = db.collection("domains");

// Obtener el tipo de autenticación y subdominio
export async function getTypeAuth(req, res) {
    let domainData = null;
    let urlPattern = null;
    let domainDoc = null;
    try {
        const { domain: fullUrl } = req.query;
        if (!fullUrl) {
            return res.status(400).json({ error: "Falta el dominio." });
        }

        const COMMON_SUFFIX = "duckdns.org";
        if (!fullUrl.endsWith(COMMON_SUFFIX)) {
            const snapshot = await domainsRef.where("domain", "==", fullUrl).get();
            if (snapshot.empty) {
                return res.status(404).json({ error: `Dominio '${fullUrl}' no encontrado.` });
            }
            domainDoc = snapshot.docs[0];
            domainData = domainDoc.data();
            urlPattern = "";
        } else {
            const parts = fullUrl.split('.');
            const domainBaseCandidate = parts.slice(-3).join('.'); // Ej: p02redes.duckdns.org

            const snapshot = await domainsRef.where("domain", "==", domainBaseCandidate).get();
            if (snapshot.empty) {
                return res.status(404).json({ error: `Dominio '${domainBaseCandidate}' no está registrado.` });
            }
            domainDoc = snapshot.docs[0];
            domainData = domainDoc.data();
            urlPattern = fullUrl.substring(0, fullUrl.length - domainBaseCandidate.length);

            if (urlPattern.endsWith('.')) {
                urlPattern = urlPattern.slice(0, -1);
            }
        }

        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Configuración no disponible." });
        }

        const urls = domainData.urls || [];
        const matchingUrlConfig = urls.find(config => config.url === urlPattern);

        if (!matchingUrlConfig) {
            return res.json({message: `No se encontró configuración específica para el patrón: ${urlPattern}.`});
        }

        res.json(matchingUrlConfig.typeAuth);

    } catch (error) {
        console.error("Error en getTypeAuthLegacy:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Obtener toda la configuración de cache/URL para un dominio
export async function getCacheConfig(req, res) {
    try {
        const { domain } = req.query;
        if (!domain) return res.status(400).json({ error: "Falta domain" });

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty) return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = snapshot.docs[0].data();

        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Configuración no disponible." });
        }

        // Devolver toda la configuración necesaria para que el Cache funcione
        res.json({
            domain: domainData.domain,
            cacheLimit: domainData.cacheSize,
            urls: domainData.urls || [], // El array de URLs con todas las configuraciones
        });
    } catch (error) {
        console.error("Error en getCacheConfig:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Validar API Key
export const validateApiKey = verifyApiKey;

// Validar Session Key
export const validateSessionKey = verifyUserPass;

// Obtener IP de un dominio/subdominio
export async function getDomainIP(req, res) {
    try {
        const { domain, subdomain } = req.query;
        if (!domain || !subdomain) {
            return res.status(400).json({ error: "Faltan parámetros: domain y subdomain son requeridos." });
        }

        const snapshot = await domainsRef.where("domain", "==", domain).get();
        if (snapshot.empty)
            return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = snapshot.docs[0].data();
        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. IP no disponible." });
        }

        // Buscar el objeto del subdominio en el array
        const subDomainEntry = domainData.urls.find(
            entry => entry.url === subdomain
        );

        if (!subDomainEntry || !subDomainEntry.ip) {
            return res.status(404).json({ error: `IP no configurada para el subdominio: ${subdomain}.${domain}` });
        }

        const fullDomain = `${subdomain}.${domain}`;
        res.json({
            domain: fullDomain,
            ip: subDomainEntry.ip
        });

    } catch (error) {
        console.error("Error al obtener IP:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Calcular distancia entre dos coordenadas (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

async function findNearestZonalCache(ip) {
    const countryDoc = await db.collection("country").doc(ip).get();

    if (!countryDoc.exists) {
        throw new Error(`No se encontró información de país para la IP ${ip}`);
    }

    const { country, latitude, longitude } = countryDoc.data();

    const zonalCacheRef = db.collection("zonal_cache");
    const sameCountrySnap = await zonalCacheRef
        .where("country", "==", country)
        .get();
    if (!sameCountrySnap.empty) {
        const zonal = sameCountrySnap.docs[0];
        return { id: zonal.id, ...zonal.data(), reason: "same_country" };
    }

    const allCachesSnap = await zonalCacheRef.get();
    if (allCachesSnap.empty) {
        throw new Error("No existen caches zonales registradas");
    }

    let nearest = null;
    let minDistance = Infinity;

    allCachesSnap.forEach((doc) => {
        const data = doc.data();
        const dist = getDistance(latitude, longitude, data.latitude, data.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = { id: doc.id, ...data, distance_km: dist, reason: "nearest" };
        }
    });

    return nearest;
}

// Endpoint que recibe una IP y devuelve la zonal cache más cercana
export async function getNearestCache(req, res) {
    const { ip } = req.params;
    try {
        const nearestCache = await findNearestZonalCache(ip);
        res.type("text/plain").send(nearestCache.ip);
    } catch (error) {
        console.error("Error en getNearestCache:", error);
        res.status(404).type("text/plain").send(error.message);
    }
}