import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Dialog from "../components/Dialog";
import CustomForm from "../components/Form"
import { API_BASE_URL } from "../constants/api"

const LoginPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false)
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: ""});

    const loginFields = [
        {
            name: "user",
            label: "Usuario",
            type: "text",
            placeholder: "Ingrese su nombre de usuario",
            required: true,
        },
        {
            name: "password",
            label: "Contraseña",
            type: "password",
            placeholder: "Ingrese su contraseña",
            required: true,
        },
    ]

    const handleLogin = async (data) => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user: data.user,
                    password: data.password
                }),
            });

            if (response.ok) {
                navigate("/dashboard");
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
                        <h1 className="text-3xl font-bold text-white mb-2">Iniciar sesión</h1>
                    </div>

                    {/* Login Form */}
                    <CustomForm fields={loginFields} submitLabel="Iniciar sesión" onSubmit={handleLogin} isLoading={isLoading} />

                    {/* Footer Links */}
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-white/70">
                        ¿Todavía no tiene una cuenta?{" "}
                        <Link to="/register" className="text-white font-semibold hover:underline">
                            Regístrese aquí
                        </Link>
                        </p>
                    </div>
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
