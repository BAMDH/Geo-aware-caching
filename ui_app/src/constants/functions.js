// Función auxiliar para copiar al portapapeles
export const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
};


// ******************************* Funciones para parsear y stringify subdominios ******************************** //
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

// Convierte un array de objetos de subdominios [{name: string, ip: string}, ...] en una cadena de texto formateada para el formulario: [nombre,ip], [nombre,ip]
export const stringifySubdomains = (subdomainsArray) => {
    // Verificar si el input es válido y es un array.
    if (!Array.isArray(subdomainsArray) || subdomainsArray.length === 0) {
        return '';
    }

    // Mapear cada objeto a su formato de cadena: [nombre,ip]
    const formattedStrings = subdomainsArray.map(subdomain => {
        // Usar la destructuración para mayor claridad
        const { name, ip } = subdomain;

        // Validar que ambos campos existan antes de formatear
        if (name && ip) {
            // Generar la cadena en el formato exacto requerido
            return `[${name.trim()},${ip.trim()}]`;
        }
        return ''; // Retornar cadena vacía para subdominios incompletos
    });

    // 3. Unir todas las cadenas formateadas con ", "
    // El filter(Boolean) elimina cualquier cadena vacía generada en el paso 2
    return formattedStrings.filter(Boolean).join(', ');
};