import React from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Producto, Stock } from '../../lib/types';

interface ProductGridProps {
  productos: Producto[];
  stocks: Stock[];
  sucursalSeleccionada: number | null;
  busquedaProducto: string;
  onBusquedaChange: (val: string) => void;
  onProductClick: (id: number) => void;
  onQuickItemClick: () => void;
}

export const ProductGrid = ({
  productos,
  stocks,
  sucursalSeleccionada,
  busquedaProducto,
  onBusquedaChange,
  onProductClick,
  onQuickItemClick,
}: ProductGridProps) => {
  const getStockProducto = (productoId: number) => {
    const stock = stocks.find(
      (s) => s.producto_id === productoId && s.sucursal_id === sucursalSeleccionada
    );
    return stock?.cantidad_litros ?? 0;
  };

  const getPrecioProducto = (productoId: number) => {
    return stocks.find(s => s.producto_id === productoId && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? 0;
  };

  const getPrecioMayoristaProducto = (productoId: number) => {
    return stocks.find(s => s.producto_id === productoId && s.sucursal_id === sucursalSeleccionada)?.precio_mayorista ?? 0;
  };

  const productosFiltrados = productos.filter(p => {
    const stockConfig = stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada);
    const estaActivo = stockConfig ? stockConfig.activo === 1 : true;
    return estaActivo && p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase());
  });

  return (
    <Card 
      title="📦 Selecciona un Producto" 
      headerAction={
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onQuickItemClick}
          className="bg-blue-100 hover:bg-blue-200 text-blue-700"
        >
          ➕ Item Rápido
        </Button>
      }
    >
      <div className="relative mb-3">
        <Input
          className="pl-10"
          placeholder="Buscar producto..."
          value={busquedaProducto}
          onChange={(e) => onBusquedaChange(e.target.value)}
        />
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl pointer-events-none">
          🔍
        </span>
        {busquedaProducto && (
          <button
            onClick={() => onBusquedaChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
        {productosFiltrados.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {busquedaProducto ? 'No se encontraron productos' : 'Cargando productos...'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {productosFiltrados.map(p => {
              const stockProducto = getStockProducto(p.id);
              const precio = getPrecioProducto(p.id);
              const precioMayorista = getPrecioMayoristaProducto(p.id);
              
              return (
                <div
                  key={p.id}
                  onClick={() => onProductClick(p.id)}
                  className="cursor-pointer rounded-lg p-3 transition-all duration-150 border-2 bg-white border-gray-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50"
                >
                  <h3 className="font-bold text-sm text-gray-800 mb-1">{p.nombre}</h3>
                  <div className="text-xs space-y-0.5">
                    <p className="text-gray-500">
                      {p.tipo === 'seco'
                        ? `$${precio} / u.`
                        : (p.tipo === 'alimento'
                          ? `$${precio}/kg`
                          : `$${precio}/L • May: ${precioMayorista}/L`
                        )
                      }
                    </p>
                    <p className={`font-medium ${stockProducto > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      📦 {p.tipo === 'seco' ? Math.floor(stockProducto) : stockProducto.toFixed(1)} {p.tipo === 'seco' ? 'u.' : (p.tipo === 'alimento' ? 'kg' : 'L')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
