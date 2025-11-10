import { db } from "../utils/firebase.js";
import crypto from "crypto";
import dns from "dns";
import { promisify } from "util"

const domainsRef = db.collection("domains");
const apiKeysRef = db.collection("api_keys");
const resolveTxtPromise = promisify(dns.resolveTxt); // Para usar async/await con DNS

// *********************************** DOMINIOS *********************************** //
// Agregar dominio //
// 1. Genera el token y guarda el dominio en la db
export async function addDomain(req, res) {
    try {
        const { domain, txt, cache_size, subdomains } = req.body;
        if (!domain || !txt) return res.status(400).json({ error: "Datos incompletos" });
        if (txt.includes(' ')) {
            return res.status(400).json({ error: "El contenido del record TXT no puede tener espacios en blanco" });
        }

        // Verificar si ya existe (sin importar si está verificado o no)
        const existing = await domainsRef.where("domain", "==", domain).get();
        if (!existing.empty) return res.status(400).json({ error: "Dominio ya registrado o en proceso de registro" });

        const newDomain = {
            domain: domain.toLowerCase(),
            createdAt: new Date(),
            userId: req.user.id,
            verificationToken: txt,
            isVerified: false,
            cache_size: cache_size || -1,
            subdomains: subdomains || [],
            urls: [],
        };

        const docRef = await domainsRef.add(newDomain);

        // Devuelve el token y el ID para que la UI pueda mostrar las instrucciones
        res.status(201).json({
            id: docRef.id,
            verificationToken: newDomain.verificationToken,
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

        const { domain, verificationToken, isVerified } = domainDoc.data();

        if (isVerified) {
            return res.status(200).json({ message: "Dominio ya verificado." });
        }

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

// *********************************** URLS *********************************** //
// Agregar URL a dominio
export async function addUrl(req, res) {
    try {
        const { domainId } = req.params;
        const { url, cache_size, file_types, ttl, replacement_policy, type_auth } = req.body;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists) return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = domainDoc.data();
        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Complete la validación TXT antes de agregar URLs." });
        }

        // Se valida que no se este excediendo el tamanno de caché del dominio
        const domainCacheLimit = domainData.cache_size || -1;
        const urlCacheSize = parseInt(cache_size, 10);
        if (urlCacheSize <= 0) {
            return res.status(400).json({ error: "El tamaño de caché de la URL debe ser un número positivo." });
        }

        const urlsSnap = await domainsRef.doc(domainId).collection("urls").get();

        // Calcular la suma total de caché ya asignada
        let assignedCacheTotal = 0;
        urlsSnap.docs.forEach(doc => {
            const size = doc.data().cache_size;
            assignedCacheTotal += parseInt(size, 10) || 0;
        });
        const newCacheTotal = assignedCacheTotal + urlCacheSize;
        if (domainCacheLimit !== -1 && newCacheTotal > domainCacheLimit) {
            return res.status(400).json({
                error: `La caché total asignada (${newCacheTotal} MB) excede el límite del dominio (${domainCacheLimit} MB). Espacio disponible: ${domainCacheLimit - assignedCacheTotal} MB.`
            });
        }

        const urlsRef = domainsRef.doc(domainId).collection("urls");
        await urlsRef.add({ url, cache_size, file_types, ttl, replacement_policy, type_auth  });
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

// Actualizar URL
export async function updateUrl(req, res) {
    try {
        const { domainId, urlId } = req.params;
        const { url, cache_size, file_types, ttl, replacement_policy, type_auth } = req.body;

        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        const urlsRef = domainsRef.doc(domainId).collection("urls");
        const urlDocRef = urlsRef.doc(urlId);
        const currentUrlDoc = await urlDocRef.get();

        if (!currentUrlDoc.exists) {
            return res.status(404).json({ error: "Configuración de URL no encontrada." });
        }

        const domainCacheLimit = domainDoc.data().cache_size || -1;
        const currentUrlData = currentUrlDoc.data();

        const updateData = {};

        // Se valida que no se este excediendo el tamanno de caché del dominio
        let newUrlCacheSize = currentUrlData.cache_size;

        if (cache_size !== undefined && cache_size !== currentUrlData.cache_size) {
            newUrlCacheSize = parseInt(cache_size, 10);

            if (newUrlCacheSize <= 0) {
                return res.status(400).json({ error: "El tamaño de caché de la URL debe ser un número positivo." });
            }

            const urlsSnap = await urlsRef.get();
            let assignedCacheTotal = 0;
            urlsSnap.docs.forEach(doc => {
                if (doc.id !== urlId) {
                    const size = doc.data().cache_size;
                    assignedCacheTotal += parseInt(size, 10) || 0;
                }
            });
            const newCacheTotal = assignedCacheTotal + newUrlCacheSize;

            if (domainCacheLimit !== -1 && newCacheTotal > domainCacheLimit) {
                return res.status(400).json({
                    error: `La nueva caché total asignada (${newCacheTotal} MB) excede el límite del dominio (${domainCacheLimit} MB).`
                });
            }

            updateData.cache_size = newUrlCacheSize;
        }

        if (url !== undefined) updateData.url = url;
        if (file_types !== undefined) updateData.file_types = file_types;
        if (ttl !== undefined) updateData.ttl = ttl;
        if (replacement_policy !== undefined) updateData.replacement_policy = replacement_policy;
        if (type_auth !== undefined) updateData.type_auth = type_auth;

        if (Object.keys(updateData).length === 0) {
            return res.status(200).json({ message: "No se proporcionaron datos para actualizar." });
        }

        await urlDocRef.update(updateData);

        res.status(200).json({ message: "Configuración åde URL actualizada correctamente." });

    } catch (error) {
        console.error("Error al actualizar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar URL de un dominio
export async function deleteUrl(req, res) {
    try {
        const { domainId, urlId } = req.params;

        // Verificar si el dominio existe
        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        // Verificar que la URL existe
        const urlDocRef = domainsRef.doc(domainId).collection("urls").doc(urlId);
        const urlDoc = await urlDocRef.get();
        if (!urlDoc.exists) {
            return res.status(404).json({ error: "URL no encontrada en este dominio." });
        }

        // Eliminar api keys asociadas a esta URL
        const associatedKeysSnap = await apiKeysRef
            .where("domainId", "==", domainId)
            .where("urlId", "==", urlId)
            .get();

        const batch = db.batch();
        associatedKeysSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`[Limpieza] Eliminadas ${associatedKeysSnap.size} API Keys asociadas a urlId: ${urlId}`);

        await urlDocRef.delete();
        res.json({ message: "Configuración de URL y sus API Keys asociadas eliminadas correctamente." });

    } catch (error) {
        console.error("Error al eliminar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}


// *********************************** API KEYS *********************************** //
// Generar un token único y seguro para la API Key
function generateApiKeyString() {
    return 'sk-' + crypto.randomBytes(24).toString('hex');
}

// Crear una nueva API Key para una URL específica
export async function createApiKey(req, res) {
    try {
        const { domainId, urlId } = req.body;

        // Verificar permisos del usuario y si la URL existe
        const urlDoc = await domainsRef.doc(domainId).collection("urls").doc(urlId).get();
        if (!urlDoc.exists || urlDoc.data().type_auth !== "apikey") {
            return res.status(400).json({ error: "URL no encontrada o no usa autenticación API Key." });
        }
        if (urlDoc.data().userId && urlDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado a este recurso." });
        }

        const newApiKey = generateApiKeyString();

        const newKeyDoc = {
            apiKey: newApiKey,
            userId: req.user.id,
            domainId: domainId,
            urlId: urlId,
            urlPattern: urlDoc.data().url,
            createdAt: new Date(),
            isActive: true,
        };

        const docRef = await apiKeysRef.add(newKeyDoc);

        res.status(201).json({
            id: docRef.id,
            message: "API Key generada correctamente. **Guárdela ahora, no se volverá a mostrar**.",
            apiKey: newApiKey
        });
    } catch (error) {
        console.error("Error al generar API Key:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Obtener las API Keys de un usuario o dominio
export async function getApiKeys(req, res) {
    try {
        const { domainId } = req.params;
        // Solo obtener las claves que pertenecen a los recursos de este usuario/dominio
        const snapshot = await apiKeysRef
            .where("userId", "==", req.user.id)
            .where("domainId", "==", domainId)
            .get();

        const keys = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                urlPattern: data.urlPattern,
                // Muestra solo los últimos 4 caracteres para identificación
                last4: data.apiKey.slice(-4),
                isActive: data.isActive
            };
        });

        res.json(keys);
    } catch (error) {
        console.error("Error al obtener API Keys:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar una API key
export async function deleteApiKey(req, res) {
    try {
        const { apiKeyId } = req.params;

        const keyDoc = await apiKeysRef.doc(apiKeyId).get();
        if (!keyDoc.exists || keyDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "API Key no encontrada o acceso denegado." });
        }

        await apiKeysRef.doc(apiKeyId).delete();
        res.json({ message: "API Key eliminada correctamente (revocada)" });
    } catch (error) {
        console.error("Error al eliminar API Key:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Verificar una API Key para acceso al Cache Zonal
export async function verifyAccessApiKey(req, res) {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: "Falta el campo 'apiKey'." });
        }

        // Buscar la clave en la colección de nivel superior
        const snapshot = await apiKeysRef
            .where("apiKey", "==", apiKey)
            .where("isActive", "==", true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Clave no encontrada o inactiva: acceso denegado
            return res.status(401).json({ valid: false, message: "API Key inválida o inactiva." });
        }

        const keyData = snapshot.docs[0].data();

        res.json({
            valid: true,
            domainId: keyData.domainId,
            urlId: keyData.urlId,
            urlPattern: keyData.urlPattern,
            message: "API Key válida."
        });

    } catch (error) {
        console.error("Error en la verificación de API Key para el Cache Zonal:", error);
        res.status(500).json({ valid: false, message: "Error interno del servidor durante la verificación." });
    }
}