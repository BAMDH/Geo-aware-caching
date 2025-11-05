import { useState } from "react"

const CustomForm = ({
    fields = [],
    submitLabel = "Submit",
    onSubmit,
    initialData = {},
    isLoading = false,
    theme = "dark",
    }) => {
    const [formValues, setFormValues] = useState(initialData)
    const [passwordVisibility, setPasswordVisibility] = useState({})

    const isLight = theme === "light"

    const togglePasswordVisibility = (fieldName) => {
        setPasswordVisibility((prev) => ({
            ...prev,
            [fieldName]: !prev[fieldName],
        }))
    }

    const handleFieldChange = (e) => {
        const { name, value } = e.target
        setFormValues((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {}
        fields.forEach((f) => (data[f.name] = formData.get(f.name)))
        onSubmit?.(data)
    }

    return (
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
        {isLoading ? (
            <div className="flex justify-center items-center py-12">
                <div
                    className={`w-8 h-8 border-4 rounded-full animate-spin ${
                    isLight
                        ? "border-[rgb(28,58,141)] border-t-transparent"
                        : "border-white border-t-transparent"
                    }`}
                ></div>
            </div>
        ) : (
            <>
            {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                    <div className="flex justify-between items-start">
                        <label htmlFor={field.name}
                            className={`block text-sm font-medium ${isLight ? "text-[rgb(28,58,141)]" : "text-white"}`}>
                        {field.label}
                        </label>
                    </div>

                {field.type === "textarea" ? (
                    <textarea
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        required={field.required}
                        defaultValue={initialData[field.name]}
                        onChange={handleFieldChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                            isLight
                            ? "bg-white border-[rgb(28,58,141)]/30 text-[rgb(28,58,141)] placeholder:text-[rgb(28,58,141)]/50 focus:ring-[rgb(28,58,141)]/50"
                            : "bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-white/30"
                        }`}
                        rows={4}
                    />
                ) : field.type === "select" ? (
                    <select
                        id={field.name}
                        name={field.name}
                        required={field.required}
                        defaultValue={initialData[field.name] || ""}
                        onChange={handleFieldChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                            isLight
                            ? "bg-white border-[rgb(28,58,141)]/30 text-[rgb(28,58,141)] focus:ring-[rgb(28,58,141)]/50"
                            : "bg-white/10 border-white/20 text-white focus:ring-white/30"
                        }`}
                    >
                        <option value="" disabled>
                            Seleccione una opción
                        </option>
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value} className={
                                isLight
                                ? "bg-white text-[rgb(28,58,141)]"
                                : "bg-[rgb(28,58,141)] text-white"
                            }>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="relative">
                        <input
                            id={field.name}
                            type={field.type === "password" && passwordVisibility[field.name] ? "text" : field.type}
                            name={field.name}
                            placeholder={field.placeholder}
                            required={field.required}
                            defaultValue={initialData[field.name]}
                            onChange={handleFieldChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                isLight
                                ? "bg-white border-[rgb(28,58,141)]/30 text-[rgb(28,58,141)] placeholder:text-[rgb(28,58,141)]/50 focus:ring-[rgb(28,58,141)]/50"
                                : "bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-white/30"
                            }`}
                        />
                        {field.type === "password" && (
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility(field.name)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                                    isLight
                                    ? "text-[rgb(28,58,141)]/70 hover:text-[rgb(28,58,141)]"
                                    : "text-white/70 hover:text-white"
                                } transition-colors focus:outline-none`}
                                aria-label={passwordVisibility[field.name] ? "Hide password" : "Show password"}
                            >
                                {passwordVisibility[field.name] ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                        />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                )}
                {field.errorMessage && <p className="text-sm text-red-300">{field.errorMessage}</p>}
            </div>
            ))}

            <button
                type="submit"
                className={`w-full px-6 py-3 font-semibold rounded-lg focus:outline-none focus:ring-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                    isLight
                    ? "bg-[rgb(28,58,141)] text-white hover:bg-[rgb(25,50,120)] focus:ring-[rgb(28,58,141)]/50 disabled:opacity-60"
                    : "bg-white text-[rgb(28,58,141)] hover:bg-white/90 focus:ring-white/50 disabled:opacity-60"
                }`}
            >
                {submitLabel}
            </button>
        </>
        )}
        </form>
    )
}

export default CustomForm
