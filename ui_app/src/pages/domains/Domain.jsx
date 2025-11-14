import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import CustomForm from "../../components/Form";
import Layout from "../../components/Layout";
import Dialog from "../../components/Dialog";
import { API_BASE_URL } from "../../constants/api";
import UrlList from "../../components/UrlList";
import ApiKeysContent from "../../components/ApiKeys";
import UserPassContent from "../../components/UserPass";

const DomainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { domainId: urlParamId } = useParams();
    const { domainId: stateDomainId, domainName } = location.state || {};
    const domainId = stateDomainId || urlParamId;

    const [domainInfo, setDomainInfo] = useState(null);
    const [urls, setUrls] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('urls');
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "", type: "info" });

    // Función para obtener los usuarios
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/userpass`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(data);
            } else {
                throw new Error("No se pudieron cargar los Usuarios/Contraseñas.");
            }
        } catch (error) {
            console.error("Error al cargar Usuarios:", error);
            setInfoDialog({ open: true, title: "Error", message: `Error al cargar User Pass: ${error.message}`, type: "error" });
        }
    };

    // Función para obtener las API Keys
    const fetchApiKeys = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/api-keys`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setApiKeys(data);
            } else {
                throw new Error("No se pudieron cargar las API Keys.");
            }
        } catch (error) {
            console.error("Error al cargar API Keys:", error);
            setInfoDialog({ open: true, title: "Error", message: `Error al cargar API Keys: ${error.message}`, type: "error" });
        }
    };

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
                fetchApiKeys(),
                fetchUsers(),
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
            const updatePayload = {
                cacheSize: Number.parseInt(data.cacheSize),
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
        // TODO
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

    // Handler para navegar a la página de Añadir URL
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
                <h1 className="text-xl font-semibold">Administración: {domainName || 'Cargando...'}</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[rgb(28,58,141)] border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-5">
                    {/* Panel de Edición de Dominio */}
                    <div className="bg-[rgb(28,58,141)]/5 p-8 rounded-xl border border-[rgb(28,58,141)]/20">
                        <h2 className="text-xl font-semibold mb-4">Información general</h2>
                        {domainInfo && (
                            <CustomForm
                                theme="light"
                                fields={[
                                    // Definición de fields con los valores que provienen del estado
                                    { name: "domain", label: "Dominio (No editable)", type: "text", disabled: true, initialValue: domainInfo.domain },
                                    { name: "cacheSize", label: "Límite de caché (MB)", type: "number", required: true, initialValue: domainInfo.cacheSize },
                                ]}
                                submitLabel="Guardar cambios"
                                onSubmit={handleUpdateDomain}
                                isLoading={isUpdating}
                                initialData={domainInfo}
                                key={`domain-form-${domainId}`}
                            />
                        )}
                    </div>

                    <div className="bg-[rgb(28,58,141)]/5 p-8 rounded-xl border border-[rgb(28,58,141)]/20">
                        {/* Controles de Pestaña */}
                        <div className="flex border-b border-gray-200 mb-6">
                            <button
                                onClick={() => setActiveTab('urls')}
                                className={`py-2 px-4 text-lg font-medium transition-colors ${
                                    activeTab === 'urls' ? 'border-b-2 border-[rgb(28,58,141)] text-[rgb(28,58,141)]' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                URLs
                            </button>
                            <button
                                onClick={() => setActiveTab('apiKeys')}
                                className={`py-2 px-4 text-lg font-medium transition-colors ${
                                    activeTab === 'apiKeys' ? 'border-b-2 border-[rgb(28,58,141)] text-[rgb(28,58,141)]' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                API Keys
                            </button>
                            <button
                                onClick={() => setActiveTab('userpass')}
                                className={`py-2 px-4 text-lg font-medium transition-colors ${
                                    activeTab === 'userpass' ? 'border-b-2 border-[rgb(28,58,141)] text-[rgb(28,58,141)]' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                Usuarios/Contraseñas
                            </button>
                        </div>

                        {/* Contenido Dinámico de la Pestaña */}
                        {activeTab === 'urls' && (
                            <UrlList
                                urls={urls}
                                handleNavigateToAddUrl={handleNavigateToAddUrl}
                                handleEditUrl={handleEditUrl}
                                handleDeleteUrl={handleDeleteUrl}
                            />
                        )}

                        {activeTab === 'apiKeys' && (
                            <ApiKeysContent
                                apiKeys={apiKeys}
                                domainId={domainId}
                                urls={urls}
                                fetchApiKeys={fetchApiKeys}
                                setInfoDialog={setInfoDialog}
                            />
                        )}

                        {activeTab === 'userpass' && (
                            <UserPassContent
                                users={users}
                                domainId={domainId}
                                urls={urls.filter(url => url.typeAuth === 'userpass')}
                                fetchUsers={fetchUsers}
                                setInfoDialog={setInfoDialog}
                            />
                        )}
                    </div>
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