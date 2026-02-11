'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Venta = {
  id: number;
  fecha: string;
  sucursal_id: number;
  sucursal_nombre: string;
  cliente_id: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  total: number;
  pagado: number;
  tipo_venta: string;
};

type Item = {
  id: number;
  producto_id: number;
  producto_nombre: string;
  producto_tipo?: string;
  cantidad_litros: number;
  precio_unitario: number;
  subtotal: number;
};

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    const cargar = async () => {
      setCargando(true);
      try {
        const res = await fetch(`/api/ventas/${id}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Error al obtener la venta');
        } else {
          setVenta(data.venta);
          setItems(data.items || []);
        }
      } catch (err) {
        console.error(err);
        setError('Error de conexión');
      }
      setCargando(false);
    };

    cargar();
  }, [params.id]);

  const imprimir = () => {
    window.print();
  };

  const fechaFormateada =
    venta &&
    new Date(venta.fecha).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm ticket-print">
        {cargando ? (
          <div className="text-center text-gray-600">Cargando ticket...</div>
        ) : error ? (
          <div className="text-center text-red-600 text-sm">{error}</div>
        ) : !venta ? (
          <div className="text-center text-gray-600 text-sm">
            Venta no encontrada
          </div>
        ) : (
          <>
            <div className="text-center border-b border-dashed pb-2 mb-2">
              <h1 className="text-lg font-bold tracking-wide">
                Sistema de Limpieza
              </h1>
              <p className="text-xs text-gray-600">
                Sucursal: {venta.sucursal_nombre}
              </p>
              <p className="text-[10px] text-gray-500">
                Ticket #{venta.id} · {fechaFormateada}
              </p>
            </div>

            {venta.cliente_nombre && (
              <div className="mb-2 text-xs">
                <p className="font-semibold text-gray-800">
                  Cliente: {venta.cliente_nombre}
                </p>
                {venta.cliente_telefono && (
                  <p className="text-gray-600">
                    Tel: {venta.cliente_telefono}
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-b border-dashed py-2 my-2">
              {items.map((item) => (
                <div key={item.id} className="mb-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800">
                      {item.producto_nombre}
                    </span>
                    <span className="text-gray-800 font-mono">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>
                      {item.producto_tipo === 'seco'
                        ? `${Math.floor(item.cantidad_litros)} u. x $${item.precio_unitario.toFixed(2)}`
                        : (item.producto_tipo === 'alimento'
                          ? `${item.cantidad_litros.toFixed(2)} kg x $${item.precio_unitario.toFixed(2)}`
                          : `${item.cantidad_litros.toFixed(2)} L x $${item.precio_unitario.toFixed(2)}`
                        )
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-2 text-xs">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Total</span>
                <span className="font-mono">${venta.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 mt-1">
                <span>Pagado</span>
                <span className="font-mono">${venta.pagado.toFixed(2)}</span>
              </div>
              {venta.total - venta.pagado !== 0 && (
                <div className="flex justify-between text-gray-700 mt-1">
                  <span>
                    {venta.tipo_venta === 'fiado' ? 'Pendiente' : 'Vuelto'}
                  </span>
                  <span className="font-mono">
                    ${(venta.total - venta.pagado).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="mt-1 text-[10px] text-gray-500">
                Tipo: {venta.tipo_venta === 'fiado' ? 'FIADO' : 'CONTADO'}
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500 mt-2 border-t border-dashed pt-2">
              ¡Gracias por su compra!
            </div>

            <div className="mt-4 flex justify-between gap-2 no-print">
              <button
                onClick={imprimir}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-xs"
              >
                Imprimir
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .ticket-print {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 80mm !important;
          }
        }
      `}</style>
    </div>
  );
}

