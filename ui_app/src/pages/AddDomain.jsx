import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import CustomForm from "../components/Form"
import { LuArrowLeft } from "react-icons/lu"
import Layout from "../components/Layout";
import { API_BASE_URL } from "../constants/api";

const AddDomainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = location.state?.userId || null;
    const [isLoading, setIsLoading] = useState(false)

    const domainFields = [
        {
            name: "domain",
            label: "Dominio",
            type: "text",
            placeholder: "ejemplo: amazon.com",
            required: true,
        },
        {
            name: "type_auth",
            label: "Tipo de autenticación",
            type: "select",
            required: true,
            options: [
                { value: "session_id", label: "Session ID" },
                { value: "api_key", label: "API Key" },
                { value: "oauth", label: "OAuth" },
                { value: "basic", label: "Basic Auth" },
            ],
        },
        {
            name: "cache_size",
            label: "Tamaño de caché (MB)",
            type: "number",
            placeholder: "ejemplo: 200",
            required: true,
        },
        {
            name: "subdomains",
            label: "Subdominios (separados por comas)",
            type: "text",
            placeholder: "ejemplo: www, api, cdn",
            required: false,
        },
    ]

    const handleSubmit = async (data) => {
        setIsLoading(true)
        try {
            // Convertir subdomains de string a array
            const subdomainsArray = data.subdomains
                ? data.subdomains
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []

            const domainData = {
                domain: data.domain,
                type_auth: data.type_auth,
                userId: userId,
                cache_size: Number.parseInt(data.cache_size),
                subdomains: subdomainsArray,
            }

            const response = await fetch(`${API_BASE_URL}/domains`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(domainData),
            })

            if (response.ok) {
                navigate("/dashboard");
            } else {
                const error = await response.json()
                console.error("Error al crear dominio:", error)
                alert("Error al crear el dominio. Por favor, intente nuevamente.")
            }
        } catch (error) {
            console.error("Error al crear dominio:", error)
            alert("Error al crear el dominio. Por favor, intente nuevamente.")
        } finally {
            setIsLoading(false)
        }
    }

    if (!userId) {
        alert("Error: no se encontró el usuario autenticado.");
        navigate("/dashboard");
        return;
    }

    return (
        <Layout>
            {/* Header con botón de regreso */}
            <div className="mb-6 inline-flex items-center gap-4" >
                <LuArrowLeft className="w-7 h-7 cursor-pointer" onClick={() => navigate("/dashboard")} />
                <span className="text-lg">Volver al dashboard</span>
            </div>

            {/* Card del formulario */}
            <div className="mx-auto bg-[rgb(28,58,141)]/5 rounded-xl p-8 border border-[rgb(28,58,141)]/20 text-[rgb(28,58,141)]">
                <h1 className="text-2xl font-semibold mb-2">Agregar Dominio</h1>
                <p className="mb-8">Complete los datos para registrar un nuevo dominio</p>
                <CustomForm theme="light" fields={domainFields} submitLabel="Crear Dominio" onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
        </Layout>
    )
}

export default AddDomainPage
