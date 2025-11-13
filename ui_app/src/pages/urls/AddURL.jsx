import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomForm from "../../components/Form";
import Dialog from "../../components/Dialog";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";
import Layout from "../../components/Layout";
import { API_BASE_URL } from "../../constants/api";

const AddURLPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Leer los datos de verificación del estado
    const initialData = location.state || {};

    // Inicializar el estado de los datos con lo que viene del Dashboard o valores por defecto
    const [formData, setFormData] = useState({
        domainId: initialData.domainId || null,
        domainName: initialData.domainName || '',
    });
    const [formKey, setFormKey] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "", type: "info" });

    const urlFields = [
        { name: "url", label: "Patrón de URL (con Wildcard)", type: "text", placeholder: "ejemplo: api.dominio.com/* o /images/*.png", required: true },
        { name: "cacheSize", label: "Tamaño de Caché (MB) para esta URL", type: "number", placeholder: "ejemplo: 50", required: true },
        { name: "fileTypes", label: "Tipos de Archivo a Cachear (separados por comas)", type: "text", placeholder: "ejemplo: png, html, js, css", required: true },
        { name: "ttl", label: "TTL (Tiempo de Vida - segundos)", type: "number", placeholder: "ejemplo: 3600 (1 hora)", required: true },
        {
            name: "replacementPolicy", label: "Política de Reemplazo de Caché", type: "select",
            options: [
                { value: "LRU", label: "LRU (Least Recently Used)" },
                { value: "LFU", label: "LFU (Least Frequently Used)" },
                { value: "FIFO", label: "FIFO (First-In, First-Out)" },
                { value: "MRU", label: "MRU (Most Recently Used)" },
                { value: "Random", label: "Random" },
            ], required: true },
    ];

    // Agregar URL
    const handleAddUrl = async (data) => {
        setIsLoading(true);
        setInfoDialog({ open: false });

        if (!formData.domainId) {
            setIsLoading(false);
            return setInfoDialog({ open: true, title: "Error", message: "ID de dominio faltante.", type: "error" });
        }

        try {
            const fileTypesArray = data.fileTypes
                ? data.fileTypes.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            const urlData = {
                url: data.url,
                cacheSize: Number.parseInt(data.cacheSize),
                fileTypes: fileTypesArray,
                ttl: Number.parseInt(data.ttl),
                replacementPolicy: data.replacementPolicy,
                typeAuth: 'api-key' // Por defecto, se usa autenticación por API Key
            };

            const response = await fetch(`${API_BASE_URL}/domains/${formData.domainId}/urls`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(urlData),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "URL Agregada", message: `La URL '${data.url}' se ha agregado correctamente.`, type: "info" });
                setFormKey(prevKey => prevKey + 1);
            } else {
                setInfoDialog({ open: true, title: "Error al configurar URL", message: result.error || "Error desconocido al agregar URL.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    }

    const handleSkipToDashboard = () => {
        setInfoDialog({ open: true, title: "Éxito", message: "Dominio activado. Redirigiendo al dashboard para la administración completa.", type: "info" });
        setTimeout(() => navigate("/dashboard"), 1500);
    };

    return (
        <Layout>
            <div className="mb-6 inline-flex items-center gap-4" >
                <LuArrowLeft className="w-7 h-7 cursor-pointer" onClick={() => navigate(-1)} />
                <span className="text-xl font-semibold">
                    Administración URLs: {formData.domainName || 'dominio'}
                </span>
            </div>

            <div className="bg-[rgb(28,58,141)]/5 rounded-xl p-8 border border-blue-200 text-[rgb(28,58,141)]">
                <h2 className="text-xl font-semibold mb-6">Configuración de URLs</h2>

                <CustomForm
                    key={formKey}
                    theme="light"
                    fields={urlFields}
                    submitLabel="Añadir URL"
                    onSubmit={handleAddUrl}
                    isLoading={isLoading}
                />

                <div className="mt-8 pt-4 border-t border-gray-300">
                    <button
                        className="w-full px-6 py-3 font-semibold rounded-lg border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                        onClick={handleSkipToDashboard}
                    >
                        Finalizar e ir al dashboard <LuChevronRight className="w-5 h-5" />
                    </button>
                </div>
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

export default AddURLPage;