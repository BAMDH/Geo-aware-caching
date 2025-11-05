import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../constants/api";

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState("");
    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Obtener datos del usuario y sus dominios
    useEffect(() => {
    const fetchDomains = async () => {
        try {
            // Obtener info del usuario
            const userRes = await fetch(`${API_BASE_URL}/users/me`, {
                credentials: "include",
            });
            if (userRes.status === 401 || userRes.status === 403) {
                navigate("/");
                return;
            }
            const userData = await userRes.json();
            setUser(userData.id);

            // Obtener dominios
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
    fetchDomains();
    }, [navigate]);

    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Mis dominios</h2>
                <button
                    className="px-4 py-2 bg-[rgb(28,58,141)] text-white rounded-lg hover:bg-[rgb(25,50,120)] transition-all"
                    onClick={() => navigate("/domainAdd", { state: { userId: user } })}>
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
                        className="bg-[rgb(28,58,141)]/10 border border-[rgb(28,58,141)]/20 rounded-xl p-4 hover:bg-[rgb(28,58,141)]/15 transition-all">
                        <h3 className="text-lg font-semibold mb-2 text-[rgb(28,58,141)]">
                            {domain.domain}
                        </h3>
                        <p className="text-sm text-[rgb(28,58,141)]/80 mb-4">
                            Tipo de autenticación:{" "}
                            <span className="font-medium text-[rgb(28,58,141)]">
                                {domain.type_auth}
                            </span>
                        </p>
                        <div className="flex gap-2">
                            <button className="flex-1 bg-[rgb(28,58,141)]/20 rounded-lg py-1 hover:bg-[rgb(28,58,141)]/30 transition">
                                Crear sesión
                            </button>
                            <button className="flex-1 bg-red-500/70 text-white rounded-lg py-1 hover:bg-red-600/80 transition">
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </Layout>
    );
};
export default Dashboard;
