import bcrypt from "bcrypt";
import { db } from "../utils/firebase.js";
import crypto from "crypto";
import dns from "dns";
import { promisify } from "util"
import { generarTokenUserPass, verificarToken } from "../utils/jwt.js";

const domainsRef = db.collection("domains");
const apiKeysRef = db.collection("api_keys");
const resolveTxtPromise = promisify(dns.resolveTxt); // Para usar async/await con DNS

// *********************************** DOMINIOS *********************************** //
// Agregar dominio //
// 1. Genera el token y guarda el dominio en la db
export async function addDomain(req, res) {
    try {
        const { domain, txt, cacheSize } = req.body;
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
            cacheSize: cacheSize || -1,
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

// Obtener un dominio por ID
export async function getDomainById(req, res) {
    try {
        const { domainId } = req.params;
        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists) {
            return res.status(404).json({ error: "Dominio no encontrado." });
        }
        res.json({ id: domainDoc.id, ...domainDoc.data() });
    } catch (error) {
        console.error("Error al obtener dominio por ID:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Actualizar dominio
export async function updateDomain(req, res) {
    try {
        const { domainId } = req.params;
        const { cacheSize } = req.body;

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        const updateData = {};
        if (cacheSize !== undefined) updateData.cacheSize = parseInt(cacheSize, 10);

        if (Object.keys(updateData).length === 0) {
            return res.status(200).json({ message: "No se proporcionaron datos para actualizar." });
        }

        await domainDocRef.update(updateData);
        res.status(200).json({ message: "Dominio actualizado correctamente." });

    } catch (error) {
        console.error("Error al actualizar dominio:", error);
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
        const { url, ip, cacheSize, fileTypes, ttl, replacementPolicy, typeAuth } = req.body;

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();
        if (!domainDoc.exists) return res.status(404).json({ error: "Dominio no encontrado" });

        const domainData = domainDoc.data();
        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. Complete la validación TXT antes de agregar URLs." });
        }

        // Validar que el url no existe en el dominio
        const currentUrls = domainData.urls || [];
        const existingUrl = currentUrls.find(item => item.url === url);
        if (existingUrl) {
            return res.status(400).json({ error: `El patrón de URL "${url}" ya está registrado en este dominio.` });
        }

        // Validar que no se este excediendo el tamanno de caché del dominio
        const domainCacheLimit = domainData.cacheSize || -1;
        const urlCacheSize = parseInt(cacheSize, 10);
        if (urlCacheSize <= 0) {
            return res.status(400).json({ error: "El tamaño de caché de la URL debe ser un número positivo." });
        }

        // Calcular la suma total de caché ya asignada
        let assignedCacheTotal = 0;
        currentUrls.forEach(item => { // Iterar sobre los elementos del array
            const size = item.cacheSize; // Obtener cacheSize del objeto en el array
            assignedCacheTotal += parseInt(size, 10) || 0;
        });
        const newCacheTotal = assignedCacheTotal + urlCacheSize;
        if (domainCacheLimit !== -1 && newCacheTotal > domainCacheLimit) {
            return res.status(400).json({
                error: `La caché total asignada (${newCacheTotal} MB) excede el límite del dominio (${domainCacheLimit} MB). Espacio disponible: ${domainCacheLimit - assignedCacheTotal} MB.`
            });
        }

        const newUrlObject = {
            url: url,
            ip: ip,
            cacheSize: urlCacheSize,
            fileTypes: fileTypes,
            ttl: parseInt(ttl, 10),
            replacementPolicy: replacementPolicy,
            typeAuth: typeAuth
        };

        // Añadir la nueva URL al array existente y actualizar el documento de dominio
        await domainDocRef.update({
            urls: [...currentUrls, newUrlObject]
        });
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
        const domainData = domainDoc.data();
        if (!domainData.isVerified) {
            return res.status(403).json({ error: "Dominio no verificado. No se pueden ver las URLs." });
        }

        const urls = domainData.urls || [];
        res.json(urls);
    } catch (error) {
        console.error("Error al obtener URLs:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Actualizar URL
export async function updateUrl(req, res) {
    try {
        const { domainId, url: oldUrlEncoded } = req.params;
        const oldUrl = decodeURIComponent(oldUrlEncoded);
        const { url: newUrl, ip, cacheSize, fileTypes, ttl, replacementPolicy, typeAuth } = req.body;

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        const domainData = domainDoc.data();
        let currentUrls = domainData.urls || [];

        const urlIndex = currentUrls.findIndex(item => item.url === oldUrl);

        if (urlIndex === -1) {
            return res.status(404).json({ error: "URL no encontrada." });
        }

        const currentUrlData = currentUrls[urlIndex];
        const domainCacheLimit = domainData.cacheSize || -1;

        if (newUrl !== undefined && newUrl !== oldUrl) {
            const existingUrl = currentUrls.find(item => item.url === newUrl);
            if (existingUrl) {
                return res.status(400).json({ error: `El nuevo patrón de URL "${newUrl}" ya está registrado en este dominio.` });
            }
        }

        // Se valida que no se este excediendo el tamanno de caché del dominio
        let newUrlCacheSize = currentUrlData.cacheSize;

        if (cacheSize !== undefined && cacheSize !== currentUrlData.cacheSize) {
            newUrlCacheSize = parseInt(cacheSize, 10);

            if (newUrlCacheSize <= 0) {
                return res.status(400).json({ error: "El tamaño de caché de la URL debe ser un número positivo." });
            }

            let assignedCacheTotal = 0;
            currentUrls.forEach((doc, index) => {
                const size = doc.cacheSize;
                if (index !== urlIndex) {
                    assignedCacheTotal += parseInt(size, 10) || 0;
                }
            });
            const newCacheTotal = assignedCacheTotal + newUrlCacheSize;

            if (domainCacheLimit !== -1 && newCacheTotal > domainCacheLimit) {
                return res.status(400).json({
                    error: `La nueva caché total asignada (${newCacheTotal} MB) excede el límite del dominio (${domainCacheLimit} MB).`
                });
            }
        }

        const updatedUrlData = { ...currentUrlData };
        if (newUrl !== undefined) updatedUrlData.url = newUrl;
        if (ip !== undefined) updatedUrlData.ip = ip;
        if (cacheSize !== undefined) updatedUrlData.cacheSize = newUrlCacheSize;
        if (fileTypes !== undefined) updatedUrlData.fileTypes = fileTypes;
        if (ttl !== undefined) updatedUrlData.ttl = parseInt(ttl, 10);
        if (replacementPolicy !== undefined) updatedUrlData.replacementPolicy = replacementPolicy;
        if (typeAuth !== undefined) updatedUrlData.typeAuth = typeAuth;

        if (Object.keys(updatedUrlData).length === Object.keys(currentUrlData).length && newUrlCacheSize === currentUrlData.cacheSize && newUrl === oldUrl) {
            return res.status(200).json({ message: "No se proporcionaron datos para actualizar." });
        }

        currentUrls[urlIndex] = updatedUrlData;
        await domainDocRef.update({ urls: currentUrls });

        res.status(200).json({ message: "El URL ha sido actualizado correctamente." });
    } catch (error) {
        console.error("Error al actualizar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar URL de un dominio
export async function deleteUrl(req, res) {
    try {
        const { domainId, urlId: urlPatternEncoded } = req.params;
        const urlPattern = decodeURIComponent(urlPatternEncoded);

        // Verificar si el dominio existe
        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(404).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        // Verificar que la URL existe
        let currentUrls = domainDoc.data().urls || [];
        const urlIndex = currentUrls.findIndex(item => item.url === urlPattern);
        if (urlIndex === -1) {
            return res.status(404).json({ error: "URL no encontrada en este dominio." });
        }

        // Eliminar api keys asociadas a esta URL
        const associatedKeysSnap = await apiKeysRef
            .where("domainId", "==", domainId)
            .where("urlPattern", "==", urlPattern)
            .get();

        const batch = db.batch();
        associatedKeysSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`[Limpieza] Eliminadas ${associatedKeysSnap.size} API Keys asociadas a URL: ${urlPattern}`);

        currentUrls.splice(urlIndex, 1);
        await domainDocRef.update({ urls: currentUrls });
        res.json({ message: "Configuración de URL y sus API Keys asociadas eliminadas correctamente." });

    } catch (error) {
        console.error("Error al eliminar URL:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// *********************************** API KEYS *********************************** //
// Crear una nueva API Key para una URL específica
export async function createApiKey(req, res) {
    try {
        const { domainId, urlPattern } = req.body;

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists) {
            return res.status(404).json({ error: "Dominio no encontrado." });
        }

        let currentUrls = domainDoc.data().urls || [];
        const urlIndex = currentUrls.findIndex(item => item.url === urlPattern);
        if (urlIndex === -1) {
            return res.status(404).json({ error: "Patrón de URL no encontrado." });
        }

        const urlConfig = currentUrls[urlIndex];
        if (urlConfig.typeAuth !== "api-key") {
            return res.status(400).json({ error: "El patrón de URL no está configurado para usar autenticación API Key." });
        }

        const newKeyObject = {
            id: crypto.randomBytes(8).toString('hex'),
            key: crypto.randomBytes(24).toString('hex'),
        };
        urlConfig.keys = urlConfig.keys || [];
        urlConfig.keys.push(newKeyObject);
        currentUrls[urlIndex] = urlConfig;

        await domainDocRef.update({
            urls: currentUrls
        });

        res.status(201).json({
            message: "API Key generada correctamente. **Guárdela ahora, no se volverá a mostrar**.",
            id: newKeyObject.id,
            apiKey: newKeyObject.key,
            urlPattern: urlPattern,
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
        const domainDoc = await domainsRef.doc(domainId).get();
        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado." });
        }

        const domainData = domainDoc.data();
        const allUrls = domainData.urls || [];

        let allKeys = [];

        allUrls.forEach(urlConfig => {
            if (urlConfig.typeAuth === "api-key") {
                const urlKeys = (urlConfig.keys || []).map(key => {
                    return {
                        id: key.id,
                        urlPattern: urlConfig.url,
                        // Muestra solo los últimos 4 caracteres del hash para identificación
                        last4: key.key.slice(-4),
                    };
                });
                allKeys = allKeys.concat(urlKeys);
            }
        });

        res.json(allKeys);
    } catch (error) {
        console.error("Error al obtener API Keys:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar una API key
export async function deleteApiKey(req, res) {
    try {
        const { domainId, apiKeyId } = req.body;

        if (!domainId || !apiKeyId) {
            return res.status(400).json({ error: "Faltan parámetros: domainId y apiKeyId son requeridos." });
        }

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado o dominio no encontrado." });
        }

        let currentUrls = domainDoc.data().urls || [];
        let keyFound = false;

        // Iterar sobre las URLs y sus arrays de keys
        currentUrls = currentUrls.map(urlConfig => {
            if (urlConfig.keys && urlConfig.keys.length > 0) {
                // Filtrar la clave que coincide con el ID
                const initialLength = urlConfig.keys.length;
                urlConfig.keys = urlConfig.keys.filter(keyObj => keyObj.id !== apiKeyId);
                if (urlConfig.keys.length < initialLength) {
                    keyFound = true;
                }
            }
            return urlConfig;
        });

        if (!keyFound) {
            return res.status(404).json({ error: "API Key no encontrada para este dominio." });
        }

        await domainDocRef.update({ urls: currentUrls });

        res.json({ message: "API Key revocada correctamente." });
    } catch (error) {
        console.error("Error al eliminar API Key (simple):", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Verificar una API Key para acceso al Cache Zonal
export async function verifyApiKey(req, res) {
    try {
        const apiKey = req.headers['client-api-key'];

        const domain = req.query.domain;
        const subdomain = req.query.subdomain;
        if (!apiKey || !domain || !subdomain) {
            return res.json(false);
        }

        const domainSnap = await domainsRef.where("domain", "==", domain).limit(1).get();

        if (domainSnap.empty) {
            return res.json(false);
        }

        const domainData = domainSnap.docs[0].data();
        let isValid = false;

        const urls = domainData.urls || [];
        urls.some(urlConfig => {
            const keys = urlConfig.keys || [];
            const keyFound = keys.find(keyObj => keyObj.key === apiKey);
            if (keyFound && urlConfig.typeAuth === "api-key") {
                isValid = true;
                return true;
            }
            return false;
        });

        res.json(isValid);
    } catch (error) {
        console.error("Error en la verificación de API Key para el Cache Zonal:", error);
        res.status(500).json({ valid: false, message: "Error interno del servidor durante la verificación." });
    }
}


// *********************************** USERPASS *********************************** //
// Crear un userpass para una URL específica
export async function createUserPass(req, res) {
    try {
        const { domainId } = req.params;
        const { urlPattern, username, password } = req.body;

        if (!domainId || !urlPattern || !username || !password) {
            return res.status(400).json({ error: "Datos incompletos: domainId, urlPattern, username y password son requeridos." });
        }

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Dominio no encontrado o acceso denegado." });
        }

        let currentUrls = domainDoc.data().urls || [];
        const urlIndex = currentUrls.findIndex(item => item.url === urlPattern);

        if (urlIndex === -1) {
            return res.status(404).json({ error: "Patrón de URL no encontrado." });
        }

        const urlConfig = currentUrls[urlIndex];
        if (urlConfig.typeAuth !== "userpass") {
            return res.status(400).json({ error: "El patrón de URL no está configurado para usar autenticación User/Pass." });
        }

        // Inicializar o verificar la estructura de usuarios
        urlConfig.users = urlConfig.users || [];

        // Verificar si el usuario ya existe en esta URL
        if (urlConfig.users.some(user => user.username === username)) {
            return res.status(400).json({ error: `El usuario '${username}' ya existe para esta URL.` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Crear el nuevo objeto de usuario con la contraseña hasheada
        const newUserObject = {
            id: crypto.randomBytes(8).toString('hex'),
            username: username,
            password: hashedPassword,
        };

        urlConfig.users.push(newUserObject);
        currentUrls[urlIndex] = urlConfig;

        await domainDocRef.update({ urls: currentUrls });

        res.status(201).json({
            message: `Usuario '${username}' creado correctamente para ${urlPattern}.`,
        });

    } catch (error) {
        console.error("Error al crear User/Pass:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Obtener los userpass
export async function getUserPass(req, res) {
    try {
        const { domainId } = req.params;
        const domainDoc = await domainsRef.doc(domainId).get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado." });
        }

        const domainData = domainDoc.data();
        const allUrls = domainData.urls || [];

        let allUsers = [];

        allUrls.forEach(urlConfig => {
            if (urlConfig.typeAuth === "userpass" && urlConfig.users) {
                const urlUsers = (urlConfig.users || [])
                    .map(user => {
                        return {
                            id: user.id,
                            username: user.username,
                            urlPattern: urlConfig.url,
                        };
                    });
                allUsers = allUsers.concat(urlUsers);
            }
        });

        res.json(allUsers);

    } catch (error) {
        console.error("Error al obtener User/Pass:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Crear userpass session
export async function createSession(req, res) {
    try {
        const { domain, urlPattern, username, password } = req.body;

        if (!domain || !urlPattern || !username || !password) {
            return res.status(400).json({ error: "Datos incompletos: domain, urlPattern, username y password son requeridos." });
        }

        // Se busca el dominio y luego el url para validar el username y password
        const domainSnap = await domainsRef.where("domain", "==", domain).limit(1).get();
        if (domainSnap.empty) {
            return res.status(404).json({ error: "Dominio no encontrado." });
        }

        const domainData = domainSnap.docs[0].data();
        const urls = domainData.urls || [];

        const urlConfig = urls.find(item => item.url === urlPattern);
        if (!urlConfig || urlConfig.typeAuth !== "userpass") {
            return res.status(400).json({ error: "La URL no requiere o no soporta autenticación User/Pass." });
        }

        const users = urlConfig.users || [];
        const userFound = users.find(user => user.username === username);
        if (!userFound) {
            return res.status(401).json({ error: "Credenciales inválidas." });
        }
        const passwordMatch = await bcrypt.compare(password, userFound.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Credenciales inválidas." });
        }

        const token = generarTokenUserPass({
            userId: userFound.id,
            domainId: domainSnap.docs[0].id,
            domain: domain,
            urlPattern: urlPattern,
        });

        res.json(token);

    } catch (error) {
        console.error("Error en la autenticación (Login):", error);
        res.status(500).json({ error: "Error interno del servidor durante el login." });
    }
}

// TODO: Editar un userpass
export async function updateUserPass(req, res) {
    try {
        const { domainId } = req.params;
        const { userId, urlPattern, newUsername, newPassword } = req.body; 

        if (!domainId || !userId || !urlPattern) {
            return res.status(400).json({ error: "Datos incompletos: domainId, userId y urlPattern son requeridos." });
        }

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado o dominio no encontrado." });
        }

        let currentUrls = domainDoc.data().urls || [];
        const urlIndex = currentUrls.findIndex(item => item.url === urlPattern);

        if (urlIndex === -1 || currentUrls[urlIndex].typeAuth !== "userpass") {
            return res.status(404).json({ error: "Patrón de URL no encontrado o no usa autenticación User/Pass." });
        }

        const urlConfig = currentUrls[urlIndex];
        const userIndex = urlConfig.users.findIndex(user => user.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: "Usuario no encontrado para esta URL." });
        }

        let userToUpdate = { ...urlConfig.users[userIndex] };
        let changesMade = false;

        if (newUsername && newUsername !== userToUpdate.username) {
            if (urlConfig.users.some((user, index) => user.username === newUsername && index !== userIndex)) {
                return res.status(400).json({ error: `El nombre de usuario '${newUsername}' ya está en uso.` });
            }
            userToUpdate.username = newUsername;
            changesMade = true;
        }

        if (newPassword) {
            userToUpdate.password = await bcrypt.hash(newPassword, 10);
            changesMade = true;
        }

        if (!changesMade) {
            return res.status(200).json({ message: "No se proporcionaron datos para actualizar." });
        }

        urlConfig.users[userIndex] = userToUpdate;
        currentUrls[urlIndex] = urlConfig;

        await domainDocRef.update({ urls: currentUrls });

        res.status(200).json({ message: `Usuario '${userToUpdate.username}' actualizado correctamente.` });

    } catch (error) {
        console.error("Error al actualizar User/Pass:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Eliminar un userpass
export async function deleteUserPass(req, res) {
    try {
        const { domainId } = req.params;
        const { userId } = req.body;

        if (!domainId || !userId) {
            return res.status(400).json({ error: "Faltan parámetros: domainId y userId son requeridos." });
        }

        const domainDocRef = domainsRef.doc(domainId);
        const domainDoc = await domainDocRef.get();

        if (!domainDoc.exists || domainDoc.data().userId !== req.user.id) {
            return res.status(403).json({ error: "Acceso denegado o dominio no encontrado." });
        }

        let currentUrls = domainDoc.data().urls || [];
        let userFound = false;

        currentUrls = currentUrls.map(urlConfig => {
            if (urlConfig.typeAuth === "userpass" && urlConfig.users && urlConfig.users.length > 0) {

                const initialLength = urlConfig.users.length;

                // Filtrar el usuario que coincide con el ID
                urlConfig.users = urlConfig.users.filter(userObj => userObj.id !== userId);
                if (urlConfig.users.length < initialLength) {
                    userFound = true;
                }
            }
            return urlConfig;
        });

        if (!userFound) {
            return res.status(404).json({ error: "Usuario no encontrado para este dominio." });
        }

        await domainDocRef.update({ urls: currentUrls });

        res.json({ message: "Usuario eliminado correctamente." });

    } catch (error) {
        console.error("Error al eliminar User/Pass:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

// Verificar una User Pass para acceso al Cache Zonal
export async function verifyUserPass(req, res) {
    const sessionToken = req.headers['client-session-id'];
    const domain = req.query.domain;
    const urlPattern = req.query.subdomain;

    if (!sessionToken || !domain || !urlPattern) {
        return res.json(false);
    }

    try {
        const decoded = verificarToken(sessionToken);
        if (decoded.domain !== domain || decoded.urlPattern !== urlPattern) {
            console.log("Token válido pero para dominio/URL incorrecto.");
            return res.json(false);
        }

        res.json(true);

    } catch (error) {
        // Si jwt.verify falla (Token inválido o expirado)
        if (error.name === 'TokenExpiredError') {
            console.log("Token de sesión expirado.");
        } else if (error.name === 'JsonWebTokenError') {
            console.log("Token de sesión inválido.");
        } else {
            console.error("Error de verificación de sesión:", error);
        }
        res.json(false);
    }
}