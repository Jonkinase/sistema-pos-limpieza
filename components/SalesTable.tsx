'use client';

import { useState, useEffect } from 'react';
import { Venta } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';

interface SalesTableProps {
    sucursalId: number;
    refreshTrigger: number;
    userRole?: string;
    onDeleteSuccess?: () => void;
    onEdit?: (venta: Venta) => void;
}

export default function SalesTable({ sucursalId, refreshTrigger, userRole, onDeleteSuccess, onEdit }: SalesTableProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Venta | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const [fechaDesde, setFechaDesde] = useState(today);
    const [fechaHasta, setFechaHasta] = useState(today);

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

    const handleDelete = async (venta: Venta) => {
        if (!confirm(`¿Estás seguro de ELIMINAR la venta #${venta.id}?\n\n⚠️ Esto devolverá el stock y ajustará la deuda del cliente si corresponde.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/ventas?id=${venta.id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                alert('✅ Venta eliminada correctamente');
                setVentas(prev => prev.filter(v => v.id !== venta.id));
                if (onDeleteSuccess) onDeleteSuccess();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('❌ Error al eliminar venta');
        }
    };

    const isAdminOrEncargado = userRole === 'admin' || userRole === 'encargado';

    return (
        <Card 
            className="mt-6 text-black" 
            title={ventas.length > 0 ? '📋 Historial de Ventas - Movimientos' : '📋 Historial de Ventas - Sin ventas'}
            headerAction={
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <label className="text-xs sm:text-sm font-bold text-black uppercase">Desde:</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 text-black bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs sm:text-sm font-bold text-black uppercase">Hasta:</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 text-black bg-white"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setFechaDesde(today);
                            setFechaHasta(today);
                        }}
                    >
                        Hoy
                    </Button>
                </div>
            }
        >
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="text-center py-4">Cargando ventas...</div>
                ) : ventas.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No hay ventas registradas en esta sucursal</div>
                ) : (
                    ventas.map((venta) => (
                        <div key={venta.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <div>
                                    <p className="font-bold text-blue-600">#{venta.id}</p>
                                    <p className="text-xs text-gray-600">{new Date(venta.fecha).toLocaleString()}</p>
                                </div>
                                <p className="font-bold text-black">${venta.total.toFixed(2)}</p>
                            </div>

                            <p className="text-sm text-black mb-1">
                                <span className="font-semibold">Cliente:</span>{' '}
                                {venta.cliente_nombre || <span className="italic">Consumidor Final</span>}
                                {venta.tipo_venta === 'fiado' && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">
                                        Fiado
                                    </span>
                                )}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                                <span className="font-semibold">Vendedor:</span> {venta.vendedor_nombre || '-'}
                            </p>
                            <p className="text-sm text-gray-700 mb-3 break-words">
                                <span className="font-semibold">Items:</span> {venta.items_resumen}
                            </p>

                            <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedSale(venta)}>👁️ Ver</Button>
                                {onEdit && isAdminOrEncargado && (
                                    <Button variant="warning" size="sm" onClick={() => onEdit(venta)}>✏️ Editar</Button>
                                )}
                                {isAdminOrEncargado && (
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(venta)}>🗑️ Eliminar</Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs sm:text-sm text-gray-700 uppercase bg-gray-50 border-b">
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
                            <tr><td colSpan={6} className="text-center py-4">Cargando ventas...</td></tr>
                        ) : ventas.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4 text-gray-500">No hay ventas registradas</td></tr>
                        ) : (
                            ventas.map((venta) => (
                                <tr key={venta.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-blue-600">#{venta.id}</span>
                                        <br />
                                        <span className="text-black text-xs">{new Date(venta.fecha).toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {venta.cliente_nombre || <span className="text-black italic">Consumidor Final</span>}
                                        {venta.tipo_venta === 'fiado' && (
                                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">Fiado</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{venta.vendedor_nombre || '-'}</td>
                                    <td className="px-4 py-3 text-black truncate max-w-[200px]" title={venta.items_resumen}>{venta.items_resumen}</td>
                                    <td className="px-4 py-3 text-right font-bold text-black">${venta.total.toFixed(2)}</td>
                                    <td className="px-4 py-3 flex flex-wrap gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedSale(venta)}>👁️ Ver</Button>
                                        {onEdit && isAdminOrEncargado && (
                                            <Button variant="warning" size="sm" onClick={() => onEdit(venta)}>✏️ Editar</Button>
                                        )}
                                        {isAdminOrEncargado && (
                                            <Button variant="danger" size="sm" onClick={() => handleDelete(venta)}>🗑️ Eliminar</Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedSale && (
                <Dialog
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    title={`Detalle Venta #${selectedSale.id}`}
                    footer={
                        <div className="flex gap-3 w-full">
                            <Button 
                                variant="primary" 
                                className="flex-1 bg-gray-800 hover:bg-gray-900" 
                                onClick={() => window.open(`/ticket/${selectedSale.id}`, '_blank')}
                            >
                                📄 Ver Ticket PDF
                            </Button>
                            <Button variant="secondary" className="flex-1" onClick={() => setSelectedSale(null)}>Cerrar</Button>
                        </div>
                    }
                >
                    <p className="text-sm text-gray-500 -mt-2 mb-4">
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

                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-bold text-xl text-black">Total</span>
                        <span className="font-bold text-2xl text-blue-600">${selectedSale.total.toFixed(2)}</span>
                    </div>
                </Dialog>
            )}
        </Card>
    );
}
