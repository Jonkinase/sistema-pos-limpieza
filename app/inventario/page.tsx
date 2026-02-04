'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Producto = {
  id: number;
  nombre: string;
};

type Sucursal = {
  id: number;
  nombre: string;
};

type Stock = {
  id: number;
  producto_id: number;
  sucursal_id: number;
  cantidad_litros: number;
};

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Verificar rol
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success || data.user.rol !== 'admin') {
          router.push('/');
        }
      })
      .catch(() => router.push('/'));

    fetch('/api/stock')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProductos(data.productos || []);
          setSucursales(data.sucursales || []);
          setStocks(data.stocks || []);
          if (data.sucursales && data.sucursales.length > 0) {
            setSucursalSeleccionada(data.sucursales[0].id);
          }
        }
      });
  }, []);

  const obtenerStock = (producto_id: number, sucursal_id: number) => {
    const row = stocks.find(
      (s) => s.producto_id === producto_id && s.sucursal_id === sucursal_id
    );
    return row?.cantidad_litros ?? 0;
  };

  const cambiarStockLocal = (producto_id: number, sucursal_id: number, valor: number) => {
    setStocks((prev) => {
      const existente = prev.find(
        (s) => s.producto_id === producto_id && s.sucursal_id === sucursal_id
      );
      if (existente) {
        return prev.map((s) =>
          s.producto_id === producto_id && s.sucursal_id === sucursal_id
            ? { ...s, cantidad_litros: valor }
            : s
        );
      }
      return [
        ...prev,
        {
          id: Date.now(),
          producto_id,
          sucursal_id,
          cantidad_litros: valor,
        },
      ];
    });
  };

  const guardarStock = async (producto_id: number, sucursal_id: number) => {
    const cantidad = obtenerStock(producto_id, sucursal_id);
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id,
          sucursal_id,
          cantidad_litros: cantidad,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMensaje(data.error || 'Error al guardar stock');
        setGuardando(false);
        return;
      }
      setMensaje('✅ Stock actualizado correctamente');
      // Actualizar fila con datos devueltos
      setStocks((prev) =>
        prev.map((s) =>
          s.producto_id === producto_id && s.sucursal_id === sucursal_id
            ? { ...s, ...data.stock }
            : s
        )
      );
    } catch (error) {
      setMensaje('Error de conexión al guardar stock');
    }
    setGuardando(false);
  };

  const sucursalActual = sucursales.find((s) => s.id === sucursalSeleccionada) || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-emerald-600 mb-2">
                📦 Inventario / Stock
              </h1>
              <p className="text-gray-600">
                Gestiona el stock por producto y sucursal.
              </p>
            </div>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              ← Volver a Ventas
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sucursal
              </label>
              <select
                className="p-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                value={sucursalSeleccionada ?? ''}
                onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            {sucursalActual && (
              <div className="text-sm text-gray-600">
                Editando stock para:{' '}
                <span className="font-semibold">{sucursalActual.nombre}</span>
              </div>
            )}
          </div>

          {mensaje && (
            <div className="mb-4 text-sm">
              <span>{mensaje}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    Stock (L)
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {sucursalSeleccionada === null ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      Selecciona una sucursal para ver el inventario.
                    </td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      No hay productos cargados.
                    </td>
                  </tr>
                ) : (
                  productos.map((producto) => {
                    const actual = obtenerStock(producto.id, sucursalSeleccionada);
                    return (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800 border-b">
                          {producto.nombre}
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-28 p-2 border-2 border-gray-300 rounded-lg text-right focus:border-emerald-500 focus:outline-none"
                            value={actual}
                            onChange={(e) =>
                              cambiarStockLocal(
                                producto.id,
                                sucursalSeleccionada,
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b">
                          <button
                            onClick={() =>
                              guardarStock(producto.id, sucursalSeleccionada)
                            }
                            disabled={guardando}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-300 text-xs md:text-sm"
                          >
                            💾 Guardar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

