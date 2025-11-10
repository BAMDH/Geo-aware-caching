import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuTriangleAlert, LuCircleCheck } from "react-icons/lu";
import Layout from "../components/Layout";
import Dialog from "../components/Dialog";
import { API_BASE_URL } from "../constants/api";

const Dashboard = () => {
    const navigate = useNavigate();
    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState({open: false, domainId: null, domainName: ""});
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: ""});

    // Obtener los dominios del usuario
    const fetchDomains = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/domains`, {
                method: "GET",
                credentials: "include",
            });
            if (response.status === 401) {
                navigate("/"); // Si no está autenticado, redirige al login
                return;
            }
            const data = await response.json();
            setDomains(data);
        } catch (error) {
            console.error("Error al cargar dominios:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Obtener dominios al cargar
    useEffect(() => {
        fetchDomains();
    }, [navigate]);

    const handleContinueVerification = (domain) => {
        // Redirigir a AddDomainPage, pasando los datos necesarios para saltar al Paso 2
        navigate("/domainAdd", {
            state: {
                domainId: domain.id,
                domainName: domain.domain,
                verificationToken: domain.verificationToken,
            }
        });
    };

    const handleDeleteDomain = async () => {
        const { domainId, domainName } = confirmDialog;

        setConfirmDialog({ ...confirmDialog, open: false });
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                setInfoDialog({
                    open: true, title: "Éxito",
                    message: `Dominio ${domainName} eliminado correctamente.`
                });
                fetchDomains();
            } else {
                const error = await response.json();
                setInfoDialog({
                    open: true, title: "Error",
                    message: `Error al eliminar el dominio: ${error.error || 'Ocurrió un error.'}`
                });
            }
        } catch (error) {
            console.error("Error al eliminar dominio:", error);
            setInfoDialog({
                open: true, title: "Error",
                message: "Error de conexión al intentar eliminar el dominio."
            });
        }
    }

    const openDeleteDialog = (domain) => {
        setConfirmDialog({
            open: true,
            domainId: domain.id,
            domainName: domain.domain,
        });
    }

    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Mis dominios</h2>
                <button
                    className="px-4 py-2 bg-[rgb(28,58,141)] text-white rounded-lg hover:bg-[rgb(25,50,120)] transition-all"
                    onClick={() => navigate("/domainAdd")}>
                    + Agregar dominio
                </button>
            </div>
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[rgb(28,58,141)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : domains.length === 0 ? (
                <p className="text-[rgb(28,58,141)]/70">
                Aún no tiene dominios registrados.
                </p>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {domains.map((domain) => (
                    <div
                        key={domain.id}
                        // Estilo basado en el estado de verificación
                        className={`rounded-xl p-6 transition-all ${
                            domain.isVerified
                                ? "bg-green-100/70 border border-green-400"
                                : "bg-yellow-50 border border-yellow-400"
                        }`}>

                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-[rgb(28,58,141)]">
                                {domain.domain}
                            </h3>
                            {domain.isVerified ? (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500 text-white font-medium">
                                    <LuCircleCheck className="w-4 h-4" /> Activo
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500 text-white font-medium">
                                    <LuTriangleAlert className="w-4 h-4" /> Pendiente
                                </span>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {!domain.isVerified ? (
                                <button
                                    onClick={() => handleContinueVerification(domain)}
                                    className="flex-1 bg-[rgb(28,58,141)] text-white rounded-lg py-1 hover:bg-[rgb(25,50,120)] transition flex items-center justify-center gap-1">
                                    Completar verificación
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(`/urlAdd`, {
                                        state: {
                                            domainId: domain.id,
                                            domainName: domain.domain
                                        }
                                    })}
                                    className="flex-1 bg-green-700/80 text-white rounded-lg py-1 hover:bg-green-800/80 transition flex items-center justify-center gap-1">
                                    Agregar URLs
                                </button>
                            )}
                            <button
                                onClick={() => openDeleteDialog(domain)}
                                className="flex-1 bg-red-600/80 text-white rounded-lg py-1 hover:bg-red-700/80 transition">
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
                </div>
            )}
            <Dialog // Confirm Dialog
                open={confirmDialog.open}
                onOpenChange={(v) => setConfirmDialog({ ...confirmDialog, open: v })}
                title={`Eliminar dominio: ${confirmDialog.domainName}`}
                description="¿Desea continuar con la eliminación de este dominio? Esta acción es irreversible."
                confirmLabel="Sí, eliminar"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteDomain}
                type="confirm"
            />

            <Dialog // Info Dialog
                open={infoDialog.open}
                onOpenChange={(v) => setInfoDialog({ ...infoDialog, open: v })}
                title={infoDialog.title}
                description={infoDialog.message}
                type="info"
            />
        </Layout>
    );
};
export default Dashboard;
