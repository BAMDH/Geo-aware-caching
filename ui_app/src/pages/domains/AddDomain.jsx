import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomForm from "../../components/Form";
import Dialog from "../../components/Dialog";
import { LuArrowLeft, LuCircleCheck, LuCopy } from "react-icons/lu";
import Layout from "../../components/Layout";
import { API_BASE_URL } from "../../constants/api";
import { parseSubdomains } from "../../constants/functions";

const AddDomainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Leer los datos de verificación del estado
    const initialData = location.state || {};

    // Determinar el paso inicial: si hay domainId y token, ir al Paso 2
    const [step, setStep] = useState(
        initialData.domainId && initialData.verificationToken
            ? 2
            : 1
    );

    // Inicializar el estado de los datos con lo que viene del Dashboard o valores por defecto
    const [formData, setFormData] = useState({
        domainId: initialData.domainId || null,
        domainName: initialData.domainName || '',
        verificationToken: initialData.verificationToken || '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "", type: "info" });

    const domainFields = [
        { name: "domain", label: "Dominio", type: "text", placeholder: "ejemplo: domain.duckdns.org", required: true },
        { name: "txt", label: "Contenido de record TXT", type: "text", placeholder: "ejemplo: HelloWorld", required: true },
        { name: "cacheSize", label: "Tamaño de caché (MB)", type: "number", placeholder: "ejemplo: 200", required: true },
        { name: "subdomains", label: "Subdominios (Formato: [nombre,ip], [nombre,ip])", type: "text", placeholder: "ejemplo: [www,192.168.1.10], [api,192.168.1.11]", required: false },
    ];

    // Crear dominio
    const handleSubmit = async (data) => {
        setIsLoading(true);
        setInfoDialog({ open: false });
        setFormData((prev) => ({ ...prev, ...data }));
        try {
            const subdomainsArray = parseSubdomains(data.subdomains);
            const domainData = {
                domain: data.domain,
                txt: data.txt,
                cacheSize: Number.parseInt(data.cacheSize),
                subdomains: subdomainsArray,
            };

            const response = await fetch(`${API_BASE_URL}/domains`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(domainData),
            });

            const result = await response.json();

            if (response.ok) {
                // Se pasa al paso 2: verificar el dominio
                setFormData({
                    domainId: result.id,
                    domainName: data.domain,
                    verificationToken: result.verificationToken,
                });
                setStep(2);
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al iniciar el registro.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    // Verificar dominio con registro TXT
    const handleVerify = async () => {
        setIsLoading(true);
        setInfoDialog({ open: false });
        try {
            const response = await fetch(`${API_BASE_URL}/domains/${formData.domainId}/verify`, {
                method: "POST",
                credentials: "include",
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: "¡Dominio verificado y activado! Redirigiendo...", type: "info" });
                setTimeout(() => navigate("/dashboard"), 1500);
            } else {
                setInfoDialog({ open: true, title: "Verificación Fallida", message: result.error || "El registro TXT no es visible o el valor es incorrecto. Intente de nuevo en unos minutos.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    // Función auxiliar para copiar al portapapeles
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    // Renderizado de Vistas (Paso 1 y 2)
    const renderStep1 = () => (
        <div className="bg-[rgb(28,58,141)]/5 rounded-xl p-8 border border-[rgb(28,58,141)]/20 text-[rgb(28,58,141)]">
            <h2 className="text-xl font-semibold mb-6">Configuración Inicial</h2>
            <CustomForm theme="light" fields={domainFields} submitLabel="Crear dominio" onSubmit={handleSubmit} isLoading={isLoading} initialValues={formData} />
        </div>
    );

    const renderStep2 = () => (
        <div className="bg-[rgb(28,58,141)]/5 rounded-xl p-8 border border-blue-200 text-[rgb(28,58,141)]">
            <h2 className="text-xl font-semibold mb-6">Verificación de Dominio</h2>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-400 mb-6">
                <p className="font-medium text-yellow-800">
                    Acción Requerida: Cree el registro TXT para "{formData.domainName}" en Duck DNS (https://www.duckdns.org/update?domains=DOMINIO&token=TOKEN&txt={formData.verificationToken})
                </p>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Valor / Contenido (Token):</p>
                    <code className="text-sm font-mono text-red-600 break-all">{formData.verificationToken}</code>
                    <button onClick={() => copyToClipboard(formData.verificationToken)} className="ml-3 text-[rgb(28,58,141)] hover:text-blue-700 p-2 rounded"><LuCopy className="w-5 h-5" /></button>
                </div>
            </div>

            <button
                className="mt-8 w-full px-6 py-3 font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleVerify}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Verificando...
                    </>
                ) : (
                    <>
                        <LuCircleCheck className="w-5 h-5" />
                        Verificar dominio
                    </>
                )}
            </button>
        </div>
    );

    return (
        <Layout>
            <div className="mb-6 inline-flex items-center gap-4" >
                <LuArrowLeft className="w-7 h-7 cursor-pointer" onClick={() => navigate("/dashboard")} />
                <span className="text-xl font-semibold">
                    {step === 1 ? "Agregar Dominio" :
                    `Verificar ${formData.domainName || 'dominio'}`}
                </span>
            </div>

            {step === 1 ? renderStep1() : renderStep2()}

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

export default AddDomainPage;