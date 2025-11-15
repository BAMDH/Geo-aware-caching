import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Dialog from "./Dialog";
import CustomForm from "./Form"

const LOGIN_ACCESS_ENDPOINT = "http://localhost:3000/domain/auth";
const CACHE_REDIRECT_URL = "http://";

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: ""});
    const [searchParams] = useSearchParams();
    const cacheDomain = searchParams.get('domain');
    const cacheUrlPattern = searchParams.get('subdomain');

    useEffect(() => {
        if (!cacheDomain || !cacheUrlPattern) {
            console.log("No se encontraron parámetros de caché en la URL.");
        }
    }, [cacheDomain, cacheUrlPattern]);

    const loginFields = [
        { name: "user", label: "Usuario", type: "text", placeholder: "Ingrese su nombre de usuario", required: true, },
        { name: "password", label: "Contraseña", type: "password", placeholder: "Ingrese su contraseña", required: true, },
    ]

    const handleLogin = async (data) => {
        setIsLoading(true)
        const isCacheLogin = cacheDomain && cacheUrlPattern;

        if (!isCacheLogin) {
            setIsLoading(false);
            setInfoDialog({
                open: true,
                title: "Error de Configuración",
                message: "Faltan los parámetros 'domain' o 'subdomain' en la URL. No se puede realizar el Login de Acceso."
            });
            return;
        }

        const endpoint = LOGIN_ACCESS_ENDPOINT;
        const payload = {
            domain: cacheDomain,
            urlPattern: cacheUrlPattern,
            username: data.user,
            password: data.password
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log(`El url a redirigir es ${CACHE_REDIRECT_URL}${cacheUrlPattern}.${cacheDomain}`);
                window.location.replace(`${CACHE_REDIRECT_URL}${cacheUrlPattern}.${cacheDomain}`);
                
            } else {
                const result = await response.json();
                const errorMessage = result.message || result.error || "El inicio de sesión ha fallado.";
                setInfoDialog({
                    open: true, title: "Error",
                    message: `Error: ${errorMessage}`
                });
            }
        } catch (error) {
            setInfoDialog({
                open: true, title: "Error",
                message: `Ocurrió un error con la solicitud de inicio de sesión ${error}.`
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(28,58,141)] px-4">
            <div className="w-full max-w-md">
                {/* Login Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Iniciar sesión caché</h1>
                    </div>

                    {/* Login Form */}
                    <CustomForm fields={loginFields} submitLabel="Iniciar sesión" onSubmit={handleLogin} isLoading={isLoading} />
                </div>
            </div>

            <Dialog // Info Dialog
                open={infoDialog.open}
                onOpenChange={(v) => setInfoDialog({ ...infoDialog, open: v })}
                title={infoDialog.title}
                description={infoDialog.message}
                type="info"
            />
        </div>
    )
}

export default LoginPage;
