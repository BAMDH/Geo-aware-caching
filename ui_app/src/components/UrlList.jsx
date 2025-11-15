import React from 'react';
import { LuPlus, LuTrash2, LuPencil } from "react-icons/lu";

const UrlList = ({ urls, handleNavigateToAddUrl, handleEditUrl, handleDeleteUrl }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">URLs ({urls.length})</h2>
                <button
                    onClick={handleNavigateToAddUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1">
                    <LuPlus className="w-5 h-5" /> Añadir Nueva
                </button>
            </div>

            {urls.length === 0 ? (
                <p className="text-gray-500">No hay URLs para este dominio.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patrón de URL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caché (MB)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File types</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Política</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {urls.map((urlConfig, index) => (
                                <tr key={urlConfig.url || index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 break-all">{urlConfig.url}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.ip}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.cacheSize}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.fileTypes}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.replacementPolicy}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{urlConfig.ttl}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${urlConfig.typeAuth === 'api-key' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                            {urlConfig.typeAuth}
                                        </span>
                                    </td>
                                    <td className="px-6 py- whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleEditUrl(urlConfig)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                            <LuPencil className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDeleteUrl(urlConfig.url)} className="text-red-600 hover:text-red-900">
                                            <LuTrash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UrlList;