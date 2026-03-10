import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ItemCarrito, Cliente } from '../../lib/types';

interface CartProps {
  carrito: ItemCarrito[];
  idVentaEditando: number | null;
  clienteSeleccionado: number | null;
  tipoVenta: 'contado' | 'fiado';
  clientes: Cliente[];
  onCancelEdit: () => void;
  onClearCart: () => void;
  onClienteChange: (id: number | null) => void;
  onTipoVentaChange: (tipo: 'contado' | 'fiado') => void;
  onGuardarPresupuesto: () => void;
  onFinalizarVenta: () => void;
}

export const Cart = ({
  carrito,
  idVentaEditando,
  clienteSeleccionado,
  tipoVenta,
  clientes,
  onCancelEdit,
  onClearCart,
  onClienteChange,
  onTipoVentaChange,
  onGuardarPresupuesto,
  onFinalizarVenta,
}: CartProps) => {
  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Card title="🛒 Carrito de Venta">
      {idVentaEditando && (
        <div className="mb-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-800 flex flex-col md:flex-row gap-4 md:justify-between md:items-center rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <p className="font-bold text-sm">Modo Edición: Venta #{idVentaEditando}</p>
              <p className="text-xs">Los cambios reemplazarán la venta original.</p>
            </div>
          </div>
          <Button variant="warning" size="sm" onClick={onCancelEdit}>
            Cancelar
          </Button>
        </div>
      )}

      {carrito.length === 0 ? (
        <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {carrito.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{item.producto_nombre}</p>
                    <p className="text-sm text-gray-600">
                      {item.litros}{item.tipo_precio === 'Unidad' || item.tipo_precio === 'Varios' ? 'u' : (item.tipo_precio === 'Kg' ? 'kg' : 'L')} × ${item.precio_unitario}/{item.tipo_precio === 'Unidad' || item.tipo_precio === 'Varios' ? 'u' : (item.tipo_precio === 'Kg' ? 'kg' : 'L')}
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.tipo_precio}
                      </span>
                    </p>
                  </div>
                  <p className="font-bold text-lg text-gray-800">
                    ${item.subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-gray-300 pt-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Select
                label="👤 Cliente:"
                value={clienteSeleccionado ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onClienteChange(val === '' ? null : Number(val));
                }}
              >
                <option value="">Consumidor Final</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💳 Tipo de Venta:
                </label>
                <div className="flex gap-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                    <input
                      type="radio"
                      name="tipoVenta"
                      value="contado"
                      checked={tipoVenta === 'contado'}
                      onChange={() => onTipoVentaChange('contado')}
                      className="w-4 h-4 text-blue-600"
                    />
                    Contado
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${clienteSeleccionado === null ? 'opacity-40 cursor-not-allowed text-gray-400' : 'text-gray-800'}`}>
                    <input
                      type="radio"
                      name="tipoVenta"
                      value="fiado"
                      checked={tipoVenta === 'fiado'}
                      disabled={clienteSeleccionado === null}
                      onChange={() => onTipoVentaChange('fiado')}
                      className="w-4 h-4 text-blue-600"
                    />
                    Fiado
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
              <span className="text-2xl font-bold text-gray-800">TOTAL:</span>
              <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                ${totalCarrito.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="warning" size="lg" onClick={onGuardarPresupuesto}>
              📄 Guardar como Presupuesto
            </Button>
            <Button variant="success" size="lg" className="text-xl py-4" onClick={onFinalizarVenta}>
              ✅ Finalizar Venta
            </Button>
            <Button variant="danger" onClick={onClearCart}>
              🗑️ Vaciar Carrito
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
