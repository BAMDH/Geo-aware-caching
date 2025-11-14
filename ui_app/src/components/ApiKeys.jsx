import React, { useState } from 'react';
import { LuPlus, LuKey, LuTrash2, LuCopy } from "react-icons/lu";
import { API_BASE_URL } from "../constants/api";
import Dialog from "./Dialog";
import { copyToClipboard } from "../constants/functions";

const ApiKeysContent = ({ apiKeys, domainId, urls, fetchApiKeys, setInfoDialog }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({open: false, keyId: null, pattern: ""});
    const [newKeyDialog, setNewKeyDialog] = useState({ open: false, apiKey: null, pattern: "" });
    const [selectedUrlPattern, setSelectedUrlPattern] = useState(urls[0]?.url || '');
    const apiAuthUrls = urls.filter(url => url.typeAuth === 'api-key');

    // Handler para crear una nueva API Key
    const handleCreateKey = async () => {
        if (!selectedUrlPattern) {
            setInfoDialog({ open: true, title: "Error", message: "Seleccione un patrón de URL para asociar la clave.", type: "error" });
            return;
        }

        setIsCreating(true);
        try {
            const payload = {
                domainId: domainId,
                urlPattern: selectedUrlPattern,
            };

            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/api-keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                setNewKeyDialog({
                    open: true,
                    apiKey: result.apiKey,
                    pattern: result.urlPattern
                });
                await fetchApiKeys();
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al crear la API Key.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsCreating(false);
        }
    };

    // Handler para eliminar una API Key
    const handleDeleteKey = async () => {
        const apiKeyIdToDelete = confirmDialog.keyId;

        if (!apiKeyIdToDelete) {
            setConfirmDialog({ ...confirmDialog, open: false });
            setInfoDialog({ open: true, title: "Error", message: "ID de clave faltante para la eliminación.", type: "error" });
            return;
        }

        setConfirmDialog({ ...confirmDialog, open: false });

        try {
            const payload = {
                domainId: domainId,
                apiKeyId: apiKeyIdToDelete,
            };
            console.log (payload);
            const response = await fetch(`${API_BASE_URL}/domains/api-keys/delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: "API Key eliminada correctamente.", type: "info" });
                await fetchApiKeys();
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al eliminar la API Key.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Claves de Acceso ({apiKeys.length})</h3>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedUrlPattern}
                        onChange={(e) => setSelectedUrlPattern(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                        disabled={apiAuthUrls.length === 0 || isCreating}
                    >
                        {apiAuthUrls.length === 0 ? (
                            <option value="">No hay URLs con Auth: API Key</option>
                        ) : (
                            apiAuthUrls.map(url => (
                                <option key={url.url} value={url.url}>
                                    {url.url}
                                </option>
                            ))
                        )}
                    </select>

                    <button
                        onClick={handleCreateKey}
                        disabled={apiAuthUrls.length === 0 || isCreating}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50">
                        {isCreating ? 'Generando...' : <><LuPlus className="w-5 h-5" /> Generar Nueva Clave</>}
                    </button>
                </div>
            </div>

            {/* Listado de API Keys */}
            {apiKeys.length === 0 ? (
                <p className="text-gray-500">No hay API Keys registradas. Genere una clave para URLs con tipo de autenticación 'api-key'.</p>
            ) : (
                <div className="space-y-3">
                    {apiKeys.map(key => (
                        <div key={key.id} className="p-4 flex justify-between items-center border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-4">
                                <LuKey className="w-6 h-6 text-indigo-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 break-all">Clave ID: ****{key.last4}</p>
                                    <p className="text-xs text-gray-500">Patrón asociado: {key.urlPattern}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfirmDialog({ open: true, keyId: key.id, pattern: key.urlPattern })}
                                className="text-red-600 hover:text-red-800 transition-colors p-1">
                                <LuTrash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Dialog // Confirmación de Eliminación
                open={confirmDialog.open}
                onOpenChange={(v) => setConfirmDialog({ ...confirmDialog, open: v })}
                title={`Eliminar API Key asociada a ${confirmDialog.pattern}`}
                description="¿Está seguro de eliminar esta clave? Las peticiones con esta clave fallarán."
                confirmLabel="Sí, eliminar clave"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteKey}
                type="confirm"
            />
            <Dialog
                open={newKeyDialog.open}
                onOpenChange={(v) => setNewKeyDialog({ ...newKeyDialog, open: v })}
                title="API Key Generada Exitosamente"
                description={(
                    <>
                        <p className="mb-3">La siguiente clave sólo se mostrará una vez. Cópiela y guárdela en un lugar seguro:</p>
                        <code className="bg-gray-100 font-mono text-sm break-all rounded-md select-text">{newKeyDialog.apiKey}</code>
                        <button onClick={() => copyToClipboard(newKeyDialog.apiKey)} className="ml-3 text-[rgb(28,58,141)] hover:text-blue-700 p-2 rounded"><LuCopy className="w-5 h-5" /></button>
                        <p className="mt-3 text-xs text-red-600">Patrón de URL asociado: {newKeyDialog.pattern}</p>
                    </>
                )}
                okLabel="Entendido, copiado"
                type="info"
            />
        </div>
    );
};

export default ApiKeysContent;