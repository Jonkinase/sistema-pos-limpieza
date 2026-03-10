import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Producto, Stock, CalculationResult } from '../../lib/types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productoSeleccionado: number;
  productos: Producto[];
  stocks: Stock[];
  sucursalSeleccionada: number | null;
  modoCalculo: 'pesos' | 'litros';
  onModoCalculoChange: (modo: 'pesos' | 'litros') => void;
  montoPesos: string;
  onMontoPesosChange: (val: string) => void;
  montoLitros: string;
  onMontoLitrosChange: (val: string) => void;
  resultado: CalculationResult | null;
  onAgregarAlCarrito: () => void;
}

export const ProductModal = ({
  isOpen,
  onClose,
  productoSeleccionado,
  productos,
  stocks,
  sucursalSeleccionada,
  modoCalculo,
  onModoCalculoChange,
  montoPesos,
  onMontoPesosChange,
  montoLitros,
  onMontoLitrosChange,
  resultado,
  onAgregarAlCarrito,
}: ProductModalProps) => {
  const producto = productos.find(p => p.id === productoSeleccionado);
  if (!producto) return null;

  const stockActual = stocks.find(
    (s) => s.producto_id === productoSeleccionado && s.sucursal_id === sucursalSeleccionada
  )?.cantidad_litros ?? 0;

  const isDry = producto.tipo === 'seco';
  const isFood = producto.tipo === 'alimento';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={producto.nombre}
      footer={
        <Button 
          variant="success" 
          size="lg" 
          disabled={!resultado} 
          onClick={onAgregarAlCarrito}
        >
          ➕ Agregar al Carrito
        </Button>
      }
    >
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        📦 Stock: {stockActual.toFixed(1)} {isFood ? 'kg' : (isDry ? 'u.' : 'L')}
        {!isDry && !isFood && ` • Mayorista desde ${producto.litros_minimo_mayorista}L`}
      </p>

      {isDry ? (
        <div className="mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-sm text-orange-800">
            📦 Producto por Unidad
          </div>
          <Input
            label="Cantidad (Unidades):"
            type="number"
            step="1"
            autoFocus
            className="text-center font-bold"
            placeholder="Ej: 1"
            value={montoLitros}
            onChange={(e) => onMontoLitrosChange(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
            <Button
              variant={modoCalculo === 'pesos' ? 'primary' : 'ghost'}
              className={`flex-1 ${modoCalculo === 'pesos' ? '' : 'text-gray-600'}`}
              onClick={() => onModoCalculoChange('pesos')}
            >
              💵 Por Pesos
            </Button>
            <Button
              variant={modoCalculo === 'litros' ? 'success' : 'ghost'}
              className={`flex-1 ${modoCalculo === 'litros' ? '' : 'text-gray-600'}`}
              onClick={() => onModoCalculoChange('litros')}
            >
              {isFood ? '🦴 Por Kilos' : '🧴 Por Litros'}
            </Button>
          </div>

          {modoCalculo === 'pesos' ? (
            <Input
              label="Monto en pesos ($):"
              type="number"
              autoFocus
              className="text-center font-bold"
              placeholder="Ej: 1000"
              value={montoPesos}
              onChange={(e) => onMontoPesosChange(e.target.value)}
            />
          ) : (
            <Input
              label={isFood ? 'Cantidad en kilogramos (kg):' : 'Cantidad en litros (L):'}
              type="number"
              step={isFood ? "0.1" : "0.5"}
              autoFocus
              className="text-center font-bold"
              placeholder={isFood ? "Ej: 1" : "Ej: 5"}
              value={montoLitros}
              onChange={(e) => onMontoLitrosChange(e.target.value)}
            />
          )}
        </>
      )}

      {resultado && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-bold text-green-600">
              {resultado.litros} {isDry ? 'u.' : (isFood ? 'kg' : 'L')}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${resultado.tipo_precio === 'Mayorista'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
              }`}>
              {resultado.tipo_precio}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            ${resultado.precio_por_litro}/{isDry ? 'u' : (isFood ? 'kg' : 'L')} × {resultado.litros}{isDry ? 'u' : (isFood ? 'kg' : 'L')}
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1">
            Total: ${resultado.total.toFixed(2)}
          </p>
          {resultado.ahorro > 0 && (
            <p className="text-sm text-green-600 mt-1">
              💰 Ahorrás ${resultado.ahorro.toFixed(2)} por mayorista
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
};
