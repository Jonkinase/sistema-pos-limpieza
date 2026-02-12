'use client';

import { useState, useEffect } from 'react';

type Venta = {
    id: number;
    fecha: string;
    total: number;
    tipo_venta: string;
    cliente_nombre: string | null;
    vendedor_nombre: string | null;
    items_count: number;
    items_resumen: string;
};

// ... (imports remain)

interface SalesTableProps {
    sucursalId: number;
    refreshTrigger: number;
    userRole?: string;
    onDeleteSuccess?: () => void;
    onEdit?: (venta: Venta) => void; // Nueva prop
}

export default function SalesTable({ sucursalId, refreshTrigger, userRole, onDeleteSuccess, onEdit }: SalesTableProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Venta | null>(null);

    // Filtros de fecha (valor por defecto: hoy)
    const today = new Date().toISOString().split('T')[0];
    const [fechaDesde, setFechaDesde] = useState(today);
    const [fechaHasta, setFechaHasta] = useState(today);

    // ... (useEffect remains same) ...
    useEffect(() => {
        if (!sucursalId) return;

        setLoading(true);
        fetch(`/api/ventas?sucursal_id=${sucursalId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setVentas(data.ventas);
                }
            })
            .finally(() => setLoading(false));
    }, [sucursalId, refreshTrigger, fechaDesde, fechaHasta]);

    // Eliminar venta
    const handleDelete = async (venta: Venta) => {
        if (!confirm(`¿Estás seguro de ELIMINAR la venta #${venta.id}?\n\n⚠️ Esto devolverá el stock y ajustará la deuda del cliente si corresponde.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/ventas?id=${venta.id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                alert('✅ Venta eliminada correctamente');
                // Recargar ventas
                setVentas(prev => prev.filter(v => v.id !== venta.id));
                // Avisar al padre para recargar stocks
                if (onDeleteSuccess) {
                    onDeleteSuccess();
                }
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('❌ Error al eliminar venta');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6 text-black">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-black">
                    📋 Historial de Ventas - {ventas.length > 0 ? 'Movimientos' : 'Sin ventas'}
                </h2>

                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-black uppercase">Desde:</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 text-black bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-black uppercase">Hasta:</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 text-black bg-white"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setFechaDesde(today);
                            setFechaHasta(today);
                        }}
                        className="text-xs bg-white hover:bg-gray-100 text-black font-bold py-1.5 px-3 rounded-lg border border-gray-200 transition"
                    >
                        Hoy
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3">ID / Fecha</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Vendedor</th>
                            <th className="px-4 py-3">Items</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-4">Cargando ventas...</td>
                            </tr>
                        ) : ventas.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-500">No hay ventas registradas en esta sucursal</td>
                            </tr>
                        ) : (
                            ventas.map((venta) => (
                                <tr key={venta.id} className="bg-white border-b hover:bg-gray-50">
                                    {/* ... (Columns content same as original, just re-rendering to keep context) ... */}
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-blue-600">#{venta.id}</span>
                                        <br />
                                        <span className="text-black text-xs">
                                            {new Date(venta.fecha).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {venta.cliente_nombre || (
                                            <span className="text-black italic">Consumidor Final</span>
                                        )}
                                        {venta.tipo_venta === 'fiado' && (
                                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">
                                                Fiado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {venta.vendedor_nombre || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-black truncate max-w-[200px]" title={venta.items_resumen}>
                                        {venta.items_resumen}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-black">
                                        ${venta.total.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 flex justify-center gap-2">
                                        <button
                                            onClick={() => setSelectedSale(venta)}
                                            className="text-blue-500 hover:text-blue-700 font-medium text-xs px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition"
                                        >
                                            👁️ Ver
                                        </button>

                                        {/* Botón Editar - Solo para admin y encargado */}
                                        {onEdit && (userRole === 'admin' || userRole === 'encargado') && (
                                            <button
                                                onClick={() => onEdit(venta)}
                                                className="text-orange-500 hover:text-orange-700 font-medium text-xs px-2 py-1 bg-orange-50 rounded hover:bg-orange-100 transition"
                                            >
                                                ✏️ Editar
                                            </button>
                                        )}

                                        {/* Solo mostrar eliminar si es admin o encargado */}
                                        {(userRole === 'admin' || userRole === 'encargado') && (
                                            <button
                                                onClick={() => handleDelete(venta)}
                                                className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Ver Detalles */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in duration-200">
                        <button
                            onClick={() => setSelectedSale(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                            Detalle Venta #{selectedSale.id}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {new Date(selectedSale.fecha).toLocaleString()}
                        </p>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Cliente:</span>
                                <span className="font-medium">{selectedSale.cliente_nombre || 'Consumidor Final'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Vendedor:</span>
                                <span className="font-medium">{selectedSale.vendedor_nombre || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tipo:</span>
                                <span className="uppercase font-medium">{selectedSale.tipo_venta}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase">Items</h4>
                            <div className="bg-white border rounded-lg p-3 max-h-40 overflow-y-auto">
                                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {(selectedSale.items_resumen || '').split(', ').map((item, i) => (
                                        <div key={i} className="py-1 border-b last:border-0 border-gray-100">
                                            • {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6 pt-4 border-t">
                            <span className="font-bold text-xl text-black">Total</span>
                            <span className="font-bold text-2xl text-blue-600">${selectedSale.total.toFixed(2)}</span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.open(`/ticket/${selectedSale.id}`, '_blank')}
                                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                            >
                                📄 Ver Ticket PDF
                            </button>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
