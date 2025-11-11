// Función auxiliar para parsear los subdominios usando el formato [nombre,ip], [nombre,ip]
export const parseSubdomains = (subdomainsString) => {
    if (!subdomainsString) return [];

    // Regex para encontrar patrones [contenido_1, contenido_2]
    // Buscará todos los pares encerrados en corchetes y separados por coma.
    // El 'g' es importante para buscar todas las ocurrencias.
    const regex = /\[\s*([^,]+)\s*,\s*([^\]]+)\s*\]/g;
    let match;
    const result = [];

    // Iterar sobre todas las coincidencias
    while ((match = regex.exec(subdomainsString)) !== null) {
        // match[1] es el nombre (el contenido antes de la coma)
        const name = match[1].trim();
        // match[2] es la IP (el contenido después de la coma y antes del corchete de cierre)
        const ip = match[2].trim();

        if (name && ip) {
            result.push({ name, ip });
        }
    }
    return result;
};