import React, { useState } from 'react';
import { LuPlus, LuUser, LuTrash2, LuPencil } from "react-icons/lu";
import Dialog from "./Dialog";
import CustomForm from "./Form";
import { API_BASE_URL } from "../constants/api";

const UserPassContent = ({ urls, domainId, users, fetchUsers, setInfoDialog }) => {
    const userPassAuthUrls = urls.filter(url => url.typeAuth === 'userpass');
    const [selectedUrlPattern, setSelectedUrlPattern] = useState(userPassAuthUrls[0]?.url || '');
    const filteredUsers = users.filter(user => user.urlPattern === selectedUrlPattern);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, pattern: "", username: "" });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);

    const handleOpenEditDialog = (user) => {
        setUserToEdit(user);
        setIsEditDialogOpen(true);
    };

    const userPassFields = [
        { name: "username", label: "Usuario", type: "text", required: true, placeholder: "Ingrese un nombre de usuario" },
        { name: "password", label: "Contraseña", type: "password", required: true, placeholder: "Ingrese una contraseña" },
    ];

    // Handler para crear user/pass
    const handleCreateUser = async (formData) => {
        if (!selectedUrlPattern) {
            setInfoDialog({ open: true, title: "Error", message: "Seleccione un patrón de URL.", type: "error" });
            return;
        }

        setIsCreating(true);

        try {
            const payload = {
                urlPattern: selectedUrlPattern,
                username: formData.username,
                password: formData.password,
            };
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/userpass`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: result.message, type: "info" });
                await fetchUsers(); // Refrescar la lista de usuarios
                setIsCreateDialogOpen(false);
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al crear el usuario.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsCreating(false);
        }
    };

    // Handler para eliminar user/pass
    const handleDeleteUser = async () => {
        const userIdToDelete = confirmDialog.userId;

        if (!userIdToDelete) {
            setConfirmDialog({ ...confirmDialog, open: false });
            setInfoDialog({ open: true, title: "Error", message: "ID de usuario faltante para la eliminación.", type: "error" });
            return;
        }

        setConfirmDialog({ ...confirmDialog, open: false });

        try {
            const payload = { userId: userIdToDelete };
            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/userpass`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: result.message || "Usuario eliminado correctamente.", type: "info" });
                await fetchUsers();
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al eliminar el usuario.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        }
    }

    // Handler para editar user/pass
    const handleEditUser = async (formData) => {
        if (!userToEdit) return;
        setIsEditing(true);

        try {
            const newPassword = formData.password;
            // Validar si realmente hay cambios
            if (formData.username === userToEdit.username && !newPassword) {
                setInfoDialog({ open: true, title: "Aviso", message: "No se detectaron cambios.", type: "info" });
                setIsEditing(false);
                return;
            }

            const payload = {
                userId: userToEdit.id,
                urlPattern: userToEdit.urlPattern,
                newUsername: formData.username,
                newPassword: newPassword || null,
            };

            const response = await fetch(`${API_BASE_URL}/domains/${domainId}/userpass`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                setInfoDialog({ open: true, title: "Éxito", message: result.message, type: "info" });
                await fetchUsers();
                setIsEditDialogOpen(false);
            } else {
                setInfoDialog({ open: true, title: "Error", message: result.error || "Error al actualizar el usuario.", type: "error" });
            }
        } catch (error) {
            setInfoDialog({ open: true, title: "Error", message: `Error de conexión: ${error.message}`, type: "error" });
        } finally {
            setIsEditing(false);
        }
    };

    const userEditFields = userToEdit ? [
        { name: "username", label: "Nuevo Usuario", type: "text", required: true, initialValue: userToEdit.username },
        { name: "password", label: "Nueva Contraseña (Opcional)", type: "password", required: false, placeholder: "Dejar vacío para no cambiar" },
    ] : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Usuarios Registrados ({filteredUsers.length})</h3>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedUrlPattern}
                        onChange={(e) => setSelectedUrlPattern(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                        disabled={userPassAuthUrls.length === 0}
                    >
                        {userPassAuthUrls.length === 0 ? (
                            <option value="">No hay URLs con Auth: User/Pass</option>
                        ) : (
                            userPassAuthUrls.map(url => (
                                <option key={url.url} value={url.url}>
                                    {url.url}
                                </option>
                            ))
                        )}
                    </select>

                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        disabled={userPassAuthUrls.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50">
                        <LuPlus className="w-5 h-5" /> Añadir Usuario
                    </button>
                </div>
            </div>

            {/* Listado de Usuarios */}
            {filteredUsers.length === 0 ? (
                <p className="text-gray-500">No hay usuarios registrados para el patrón seleccionado.</p>
            ) : (
                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="p-4 flex justify-between items-center border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-4">
                                <LuUser className="w-6 h-6 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 break-all">Usuario: {user.username}</p>
                                    <p className="text-xs text-gray-500">Patrón asociado: {user.urlPattern}</p>
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleOpenEditDialog(user)}
                                    className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 mr-3">
                                    <LuPencil className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setConfirmDialog({ open: true, userId: user.id, pattern: user.urlPattern, username: user.username })}
                                    className="text-red-600 hover:text-red-800 transition-colors p-1">
                                    <LuTrash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Diálogo de Creación de Usuario */}
            <Dialog
                type="form"
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                title={`Crear Usuario para ${selectedUrlPattern}`}
                isLoading={isCreating}
                cancelLabel="Cancelar"
            >
                <CustomForm
                    theme="light"
                    fields={userPassFields}
                    onSubmit={handleCreateUser}
                    submitLabel="Crear Usuario"
                    isLoading={isCreating}
                />
            </Dialog>

            {/* Diálogo de Edición de Usuario */}
            {userToEdit && (
                <Dialog
                    type="form"
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    title={`Editar Usuario: ${userToEdit.username}`}
                    isLoading={isEditing}
                    cancelLabel="Cancelar"
                >
                    <CustomForm
                        theme="light"
                        fields={userEditFields}
                        onSubmit={handleEditUser}
                        submitLabel="Guardar Cambios"
                        isLoading={isEditing}
                    />
                </Dialog>
            )}

            {/* Diálogo de Confirmación de Eliminación */}
            <Dialog
                open={confirmDialog.open}
                onOpenChange={(v) => setConfirmDialog({ ...confirmDialog, open: v })}
                title={`Eliminar usuario asociado a ${confirmDialog.pattern}`}
                description={`¿Está seguro de eliminar a ${confirmDialog.username}? Este usuario ya no podrá acceder a la URL ${confirmDialog.pattern}.`}
                confirmLabel="Sí, eliminar usuario"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteUser}
                type="confirm"
            />
        </div>
    );
};

export default UserPassContent;