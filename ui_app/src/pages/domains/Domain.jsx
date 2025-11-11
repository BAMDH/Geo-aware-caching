import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LuArrowLeft, LuPlus } from "react-icons/lu";
import CustomForm from "../../components/Form";
import Layout from "../../components/Layout";
import Dialog from "../../components/Dialog";
import { API_BASE_URL } from "../../constants/api";

const DomainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { domainId: urlParamId } = useParams();
    const { domainId: stateDomainId, domainName } = location.state || {};
    const domainId = stateDomainId || urlParamId;

    const [domainInfo, setDomainInfo] = useState(null);
    const [urls, setUrls] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "", type: "info" });

    // Función para obtener la información general del dominio
    const fetchDomainInfo = async () => {
        if (!domainId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}`, {
                method: "GET",
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setDomainInfo(data);
            } else {
                console.error("No se pudo cargar la info del dominio.");
            }
        } catch (error) {
            console.error("Error al cargar info del dominio:", error);
        }
    };

    // Función para obtener las URLs y la info completa del dominio
    const fetchDomainData = async () => {
        if (!domainId) return;
        setIsLoading(true);
        try {
            await Promise.all([
                fetchDomainInfo(),
                (async () => {
                    const response = await fetch(`${API_BASE_URL}/domains/${domainId}/urls`, {
                        method: "GET",
                        credentials: "include",
                    });
                    if (response.ok) {
                        setUrls(await response.json());
                    } else {
                        throw new Error("No se pudieron cargar las URLs.");
                    }
                })()
            ]);
        } catch (error) {
            console.error("Error al cargar data del dominio:", error);
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateDomain = async (data) => {
        setIsUpdating(true);
        setInfoDialog({ open: false });
        try {
            const subdomainsArray = data.subdomains ? data.subdomains.split(",").map((s) => s.trim()).filter(Boolean) : domainInfo.subdomains;

            const updatePayload = {
                cacheSize: Number.parseInt(data.cacheSize),
                subdomains: subdomainsArray,
            };

            const response = await fetch(`${API_BASE_URL}/domains/${domainId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updatePayload),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: "Configuración del dominio actualizada correctamente.", type: "info" });
                await fetchDomainInfo();
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al actualizar el dominio.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsUpdating(false);
        }
    };

    // TODO Handler para editar una URL
    const handleEditUrl = (urlObject) => {
        // NOTA: Asumiendo que tendrás una ruta /urlEdit/:domainId
        navigate(`/urlEdit/${domainId}`, {
            state: {
                domainId: domainId,
                domainName: domainName || domainInfo?.domain,
                urlToEdit: urlObject,
            }
        });
    };

    // Handler para eliminar una URL
    const handleDeleteUrl = async (urlPattern) => {
        setIsLoading(true);
        setInfoDialog({ open: false });

        // NOTA: El URL debe ser codificado porque el patrón puede contener '/' o '*'
        const encodedUrl = encodeURIComponent(urlPattern);

        try {
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/urls/${encodedUrl}`, {
                method: "DELETE",
                credentials: "include",
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: `URL eliminada: ${urlPattern}.`, type: "info" });
                await fetchDomainData();
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al eliminar URL.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!domainId) {
            setInfoDialog({ open: true, title: "Error", message: "ID de dominio faltante. Vuelva al Dashboard.", type: "error" });
            return;
        }
        fetchDomainData();
    }, [domainId]);

    // Handler para navegar a la página de Añadir URL (usando el componente AddURLPage)
    const handleNavigateToAddUrl = () => {
        navigate(`/urlAdd`, {
            state: {
                domainId: domainId,
                domainName: domainName
            }
        });
    };

    return (
        <Layout>
            <div className="mb-6 inline-flex items-center gap-4">
                <LuArrowLeft className="w-7 h-7 cursor-pointer" onClick={() => navigate("/dashboard")} />
                <h1 className="text-2xl font-semibold">Administración: {domainName || 'Cargando...'}</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[rgb(28,58,141)] border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-8">
                    {/* Panel de Edición de Dominio */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Información general</h2>
                        {domainInfo && (
                            <CustomForm
                                theme="light"
                                fields={[
                                    // Definición de fields con los valores que provienen del estado
                                    { name: "domain", label: "Dominio (No editable)", type: "text", disabled: true, initialValue: domainInfo.domain },
                                    { name: "cacheSize", label: "Límite de caché (MB)", type: "number", required: true, initialValue: domainInfo.cacheSize },
                                    { name: "subdomains", label: "Subdominios (separados por comas)", type: "text", placeholder: "ej: www, api", required: false, initialValue: domainInfo.subdomains?.join(', ') || '' },
                                ]}
                                submitLabel="Guardar cambios"
                                onSubmit={handleUpdateDomain}
                                isLoading={isUpdating}
                                initialData={domainInfo}
                                key={`domain-form-${domainId}`}
                            />
                        )}
                    </div>

                    {/* Panel de URLs */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">URLs ({urls.length})</h2>
                            <button
                                onClick={handleNavigateToAddUrl}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1">
                                <LuPlus className="w-5 h-5" /> Añadir Nueva
                            </button>
                        </div>

                        {urls.length === 0 ? (
                            <p className="text-gray-500">No hay URLs para este dominio.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patrón de URL</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caché (MB)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File types</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Política</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {urls.map((urlConfig, index) => (
                                            <tr key={urlConfig.url || index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 break-all">{urlConfig.url}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.cacheSize}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.fileTypes}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.replacementPolicy}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.ttl}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${urlConfig.typeAuth === 'apikey' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                                        {urlConfig.typeAuth}
                                                    </span>
                                                </td>
                                                <td className="px-6 py- whitespace-nowrap text-sm font-medium">
                                                    <button onClick={() => handleEditUrl(urlConfig)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => handleDeleteUrl(urlConfig.url)} className="text-red-600 hover:text-red-900">
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* TODO: Panel de API Keys */}
                </div>
            )}

            <Dialog
                open={infoDialog.open}
                onOpenChange={(v) => setInfoDialog({ ...infoDialog, open: v })}
                title={infoDialog.title}
                description={infoDialog.message}
                type={infoDialog.type}
                okLabel="OK"
            />
        </Layout>
    );
};

export default DomainPage;