'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Estadisticas = {
  hoy: { cantidad: number; total: number };
  mes: { cantidad: number; total: number };
  sucursales: Array<{ nombre: string; cantidad: number; total: number }>;
  deudas: { total: number; clientes: number };
  presupuestos: { pendientes: number; total: number };
  topProductos: Array<{ nombre: string; litros_vendidos: number; total_vendido: number }>;
  ventasPorTipo: Array<{ tipo_venta: string; cantidad: number; total: number }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    fetch('/api/estadisticas')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.estadisticas);
        }
        setCargando(false);
      });
  }, []);

  const descargarReporteVentas = () => {
    const params = new URLSearchParams();
    if (desde && hasta) {
      params.set('desde', desde);
      params.set('hasta', hasta);
    }
    params.set('formato', 'excel');
    const url = `/api/reportes/ventas?${params.toString()}`;
    window.open(url, '_blank');
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-indigo-600">Cargando estadísticas...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-red-600">Error al cargar estadísticas</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-indigo-600 mb-2">
                📊 Dashboard
              </h1>
              <p className="text-gray-600">Panel de control y estadísticas</p>
            </div>
            <Link 
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              ← Volver a Ventas
            </Link>
          </div>
        </div>

        {/* Tarjetas de Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          
          {/* Ventas de Hoy */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold opacity-90">Ventas Hoy</h3>
              <span className="text-3xl">📅</span>
            </div>
            <p className="text-4xl font-bold mb-1">${stats.hoy.total.toFixed(2)}</p>
            <p className="text-sm opacity-80">{stats.hoy.cantidad} ventas</p>
          </div>

          {/* Ventas del Mes */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold opacity-90">Ventas del Mes</h3>
              <span className="text-3xl">📈</span>
            </div>
            <p className="text-4xl font-bold mb-1">${stats.mes.total.toFixed(2)}</p>
            <p className="text-sm opacity-80">{stats.mes.cantidad} ventas</p>
          </div>

          {/* Deudas Pendientes */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold opacity-90">Deudas Pendientes</h3>
              <span className="text-3xl">💳</span>
            </div>
            <p className="text-4xl font-bold mb-1">${stats.deudas.total.toFixed(2)}</p>
            <p className="text-sm opacity-80">{stats.deudas.clientes} clientes</p>
          </div>

          {/* Presupuestos Pendientes */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold opacity-90">Presupuestos</h3>
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-4xl font-bold mb-1">{stats.presupuestos.pendientes}</p>
            <p className="text-sm opacity-80">${stats.presupuestos.total.toFixed(2)} potencial</p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Ventas por Sucursal */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🏪 Ventas por Sucursal (Mes)
            </h2>
            <div className="space-y-3">
              {stats.sucursales.map((sucursal, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">{sucursal.nombre}</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${sucursal.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ 
                        width: `${stats.mes.total > 0 ? (sucursal.total / stats.mes.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{sucursal.cantidad} ventas</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Productos */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🏆 Top Productos (Mes)
            </h2>
            <div className="space-y-3">
              {stats.topProductos.map((producto, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="font-bold text-gray-800">{producto.nombre}</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      ${producto.total_vendido.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ml-10">
                    {producto.litros_vendidos.toFixed(2)} Litros vendidos
                  </p>
                </div>
              ))}
              {stats.topProductos.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay ventas este mes</p>
              )}
            </div>
          </div>

          {/* Ventas: Contado vs Fiado */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              💰 Contado vs Fiado (Mes)
            </h2>
            <div className="space-y-4">
              {stats.ventasPorTipo.map((tipo, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 capitalize flex items-center gap-2">
                      {tipo.tipo_venta === 'contado' ? '✅' : '💳'} {tipo.tipo_venta}
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${tipo.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{tipo.cantidad} ventas</p>
                </div>
              ))}
              {stats.ventasPorTipo.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay ventas este mes</p>
              )}
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              ⚡ Accesos Rápidos
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link 
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-center transition-all"
              >
                🛒<br/>Nueva Venta
              </Link>
              <Link 
                href="/clientes"
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-4 rounded-lg text-center transition-all"
              >
                💳<br/>Clientes
              </Link>
              <Link 
                href="/presupuestos"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-lg text-center transition-all"
              >
                📄<br/>Presupuestos
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg text-center transition-all"
              >
                🔄<br/>Actualizar
              </button>
            </div>

            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                📑 Reporte de Ventas (Excel)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Desde (opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hasta (opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </div>
                <button
                  onClick={descargarReporteVentas}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg text-sm"
                >
                  ⬇️ Descargar Excel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Si no seleccionas fechas, se exporta el mes actual. El archivo se descarga en formato CSV compatible con Excel.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}