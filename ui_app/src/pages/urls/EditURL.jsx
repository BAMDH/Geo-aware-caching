import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomForm from "../../components/Form";
import Dialog from "../../components/Dialog";
import { LuArrowLeft } from "react-icons/lu";
import Layout from "../../components/Layout";
import { API_BASE_URL } from "../../constants/api";

const EditURLPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Obtener datos del estado de navegación
    const { domainId, domainName, urlToEdit } = location.state || {};

    const [isLoading, setIsLoading] = useState(false);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "", type: "info" });
    const [initialFormData, setInitialFormData] = useState(null);

    // 2. Preparar los datos iniciales para el CustomForm
    useEffect(() => {
        if (!domainId || !urlToEdit) {
            setInfoDialog({ open: true, title: "Error", message: "Datos de URL o dominio faltantes para editar.", type: "error" });
            return;
        }

        // Convertir el array de fileTypes a string separada por comas para el campo del formulario
        const fileTypesString = Array.isArray(urlToEdit.fileTypes) ? urlToEdit.fileTypes.join(", ") : urlToEdit.fileTypes;

        setInitialFormData({
            url: urlToEdit.url,
            ip: urlToEdit.ip,
            cacheSize: urlToEdit.cacheSize,
            fileTypes: fileTypesString,
            ttl: urlToEdit.ttl,
            replacementPolicy: urlToEdit.replacementPolicy,
            typeAuth: urlToEdit.typeAuth,
        });

    }, [domainId, urlToEdit]);

    const urlFields = [
        { name: "url", label: "Patrón de URL (Original)", type: "text", disabled: true, required: true, initialValue: urlToEdit?.url },
        { name: "newUrl", label: "Nuevo Patrón de URL (Opcional)", type: "text", placeholder: "Dejar vacío para no cambiar" }, // Nuevo campo
        { name: "ip", label: "Dirección IP", type: "text", placeholder: "ejemplo: 192.129.12.21", required: true, initialValue: urlToEdit?.ip },
        { name: "cacheSize", label: "Tamaño de Caché (MB) para esta URL", type: "number", placeholder: "ejemplo: 50", required: true, initialValue: urlToEdit?.cacheSize },
        { name: "fileTypes", label: "Tipos de Archivo (separados por comas)", type: "text", placeholder: "ejemplo: png, html, js, css", required: true, initialValue: initialFormData?.fileTypes },
        { name: "ttl", label: "TTL (Tiempo de Vida - segundos)", type: "number", placeholder: "ejemplo: 3600", required: true, initialValue: urlToEdit?.ttl },
        {
            name: "replacementPolicy", label: "Política de Reemplazo de Caché", type: "select",
            options: [
                { value: "LRU", label: "LRU (Least Recently Used)" },
                { value: "LFU", label: "LFU (Least Frequently Used)" },
                { value: "FIFO", label: "FIFO (First-In, First-Out)" },
                { value: "MRU", label: "MRU (Most Recently Used)" },
                { value: "Random", label: "Random" },
            ], required: true, initialValue: urlToEdit?.replacementPolicy },
        { name: "typeAuth", label: "Tipo de autenticación", type: "select", options: [{ value: "api-key", label: "API key" },{ value: "userpass", label: "Usuario y contraseña" },], required: true, initialValue: urlToEdit?.typeAuth },
    ];

    // Handler para editar la URL
    const handleEditUrlSubmit = async (data) => {
        setIsLoading(true);
        setInfoDialog({ open: false });

        if (!domainId || !urlToEdit?.url) {
            setIsLoading(false);
            return setInfoDialog({ open: true, title: "Error", message: "Datos de dominio o URL original faltantes.", type: "error" });
        }

        // El patrón original de la URL debe ser codificado
        const oldUrlEncoded = encodeURIComponent(urlToEdit.url);

        try {
            const fileTypesArray = data.fileTypes
                ? data.fileTypes.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            const urlData = {
                // El campo 'url' no se usa aquí, usamos 'newUrl'
                url: data.newUrl || urlToEdit.url, // Si newUrl está vacío, usamos el viejo
                ip: data.ip,
                cacheSize: Number.parseInt(data.cacheSize),
                fileTypes: fileTypesArray,
                ttl: Number.parseInt(data.ttl),
                replacementPolicy: data.replacementPolicy,
                typeAuth: data.typeAuth,
            };

            // Envío con método PUT al endpoint correcto con la URL original codificada
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/urls/${oldUrlEncoded}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(urlData),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "URL Actualizada", message: result.message, type: "info" });
                setTimeout(() => navigate(`/dashboard`), 1500);
            } else {
                setInfoDialog({ open: true, title: "Error al actualizar URL", message: result.error || "Error desconocido al actualizar URL.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    }

    if (!urlToEdit || !initialFormData) {
        return <Layout><p className="p-8 text-red-500">Cargando o datos no disponibles.</p></Layout>;
    }

    return (
        <Layout>
            <div className="mb-6 inline-flex items-center gap-4" >
                <LuArrowLeft className="w-7 h-7 cursor-pointer" onClick={() => navigate(-1)} />
                <span className="text-xl font-semibold">
                    Editando URL: {urlToEdit.url} en {domainName}
                </span>
            </div>

            <div className="bg-[rgb(28,58,141)]/5 rounded-xl p-8 border border-blue-200 text-[rgb(28,58,141)]">
                <h2 className="text-xl font-semibold mb-6">Configuración de URLs</h2>

                <CustomForm
                    theme="light"
                    fields={urlFields}
                    submitLabel="Guardar Cambios"
                    onSubmit={handleEditUrlSubmit}
                    isLoading={isLoading}
                    // Pasar los datos iniciales al formulario
                    initialData={initialFormData}
                />
            </div>

            <Dialog
                open={infoDialog.open}
                onOpenChange={(v) => setInfoDialog({ ...infoDialog, open: v })}
                title={infoDialog.title}
                description={infoDialog.message}
                type="info"
                okLabel="OK"
            />
        </Layout>
    );
};

export default EditURLPage;