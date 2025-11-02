import { useState } from "react";
import { Link } from "react-router-dom";
import Dialog from "../components/Dialog";
import CustomForm from "../components/Form"
import { API_BASE_URL } from "../constants/api"

const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: ""});

    const signupFields = [
        {
            name: "user",
            label: "Usuario",
            type: "text",
            placeholder: "Ingrese un nombre de usuario",
            required: true,
        },
        {
            name: "password",
            label: "Contraseña",
            type: "password",
            placeholder: "Ingrese una contraseña",
            required: true,
        },
        {
            name: "confirmPassword",
            label: "Confirme la contraseña",
            type: "password",
            placeholder: "Confirme la contraseña",
            required: true,
        },
    ]

    const handleSignup = async (data) => {
        if (data.password !== data.confirmPassword) {
            setInfoDialog({
                open: true, title: "Error",
                message: `Las contraseñas no coinciden.`
            });
            return;
        } else {
            setIsLoading(true)
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user: data.user,
                        password: data.password
                    }),
                });

                if (response.ok) {
                    setInfoDialog({
                        open: true, title: "Éxito",
                        message: `Registro exitoso.`
                    }); // TODO: Redirigir a dashboard
                } else {
                    const result = await response.json();
                    const errorMessage = result.message || result.error || "El registro ha fallado.";
                    setInfoDialog({
                        open: true, title: "Error",
                        message: `Error: ${errorMessage}`
                    });
                }
            } catch (error) {
                setInfoDialog({
                    open: true, title: "Error",
                    message: `Ocurrió un error realizando la solicitud de registro ${error}.`
                });
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(28,58,141)] px-4 py-8">
            <div className="w-full max-w-md">
                {/* Signup Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Registrarse</h1>
                    </div>

                    {/* Signup Form */}
                    <CustomForm fields={signupFields} submitLabel="Registrarse" onSubmit={handleSignup} isLoading={isLoading} />

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/70">
                        ¿Ya tiene una cuenta?{" "}
                        <Link to="/" className="text-white font-semibold hover:underline">
                            Inicie sesión aquí
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

export default RegisterPage;
