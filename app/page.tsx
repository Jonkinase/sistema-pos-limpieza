'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Producto = {
  id: number;
  nombre: string;
  precio_minorista: number;
  precio_mayorista: number;
  litros_minimo_mayorista: number;
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
type ItemCarrito = {
  producto_id: number;
  producto_nombre: string;
  litros: number;
  precio_unitario: number;
  subtotal: number;
  tipo_precio: string;
};

export default function PuntoDeVenta() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number>(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number>(0);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [montoPesos, setMontoPesos] = useState<string>('');
  const [montoLitros, setMontoLitros] = useState<string>('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<'pesos' | 'litros'>('pesos');

  // Cerrar sesión
  const cerrarSesion = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  // Cargar productos y sucursales al inicio
  useEffect(() => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => {
        setProductos(data.productos || []);
        setSucursales(data.sucursales || []);
        setStocks(data.stocks || []);
      });
  }, []);

  const stockActualSeleccionado = (() => {
    if (!productoSeleccionado || !sucursalSeleccionada) return null;
    const stock = stocks.find(
      (s) =>
        s.producto_id === productoSeleccionado &&
        s.sucursal_id === sucursalSeleccionada
    );
    return stock?.cantidad_litros ?? 0;
  })();

  // Obtener stock para cualquier producto en la sucursal actual
  const getStockProducto = (productoId: number) => {
    const stock = stocks.find(
      (s) => s.producto_id === productoId && s.sucursal_id === sucursalSeleccionada
    );
    return stock?.cantidad_litros ?? 0;
  };

  // Filtrar productos por búsqueda
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // Calcular litros cuando cambia el monto
  const calcularLitros = async () => {
    if (!productoSeleccionado || !montoPesos) {
      alert('Selecciona un producto y un monto');
      return;
    }

    setCalculando(true);
    try {
      const res = await fetch('/api/calcular-venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoSeleccionado,
          monto_pesos: parseFloat(montoPesos)
        })
      });

      const data = await res.json();
      if (data.success) {
        setResultado(data);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al calcular');
    }
    setCalculando(false);
  };

  // Calcular desde litros directamente
  const calcularDesdeLitros = () => {
    if (!productoSeleccionado || !montoLitros) {
      alert('Selecciona un producto y una cantidad de litros');
      return;
    }

    const producto = productos.find(p => p.id === productoSeleccionado);
    if (!producto) {
      alert('Producto no encontrado');
      return;
    }

    const litros = parseFloat(montoLitros);
    if (litros <= 0) {
      alert('La cantidad de litros debe ser mayor a 0');
      return;
    }

    // Aplicar lógica mayorista/minorista
    const esMayorista = litros >= producto.litros_minimo_mayorista;
    const precioUnitario = esMayorista ? producto.precio_mayorista : producto.precio_minorista;
    const total = litros * precioUnitario;
    const ahorroMayorista = esMayorista ? litros * (producto.precio_minorista - producto.precio_mayorista) : 0;

    setResultado({
      success: true,
      producto: producto.nombre,
      litros: litros,
      precio_por_litro: precioUnitario,
      tipo_precio: esMayorista ? 'Mayorista' : 'Minorista',
      total: total,
      ahorro: ahorroMayorista
    });
  };

  // Abrir modal al seleccionar producto
  const abrirModalProducto = (productoId: number) => {
    setProductoSeleccionado(productoId);
    setMontoPesos('');
    setMontoLitros('');
    setResultado(null);
    setModoCalculo('pesos');
    setModalAbierto(true);
  };

  // Cerrar modal
  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSeleccionado(0);
    setMontoPesos('');
    setMontoLitros('');
    setResultado(null);
  };

  // Agregar al carrito
  const agregarAlCarrito = () => {
    if (!resultado) return;

    const nuevoItem: ItemCarrito = {
      producto_id: productoSeleccionado,
      producto_nombre: resultado.producto,
      litros: resultado.litros,
      precio_unitario: resultado.precio_por_litro,
      subtotal: resultado.total,
      tipo_precio: resultado.tipo_precio
    };

    setCarrito([...carrito, nuevoItem]);
    cerrarModal();
  };

  // Guardar presupuesto
  const guardarPresupuesto = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const clienteNombre = prompt('Nombre del cliente para el presupuesto:');
    if (!clienteNombre) return;

    try {
      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursal_id: sucursalSeleccionada,
          cliente_nombre: clienteNombre,
          items: carrito
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Presupuesto #${data.presupuesto_id} guardado correctamente`);
        setCarrito([]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al guardar presupuesto');
    }
  };


  // Finalizar venta
  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const tipoVenta = confirm('¿Es venta al CONTADO?\n\nOK = Contado\nCancelar = Fiado');

    let cliente_id = null;

    if (!tipoVenta) {
      // Es fiado, pedir cliente
      const clienteNombre = prompt('Ingresa el nombre del cliente (debe existir):');
      if (!clienteNombre) return;

      // Buscar cliente
      const resClientes = await fetch('/api/clientes');
      const dataClientes = await resClientes.json();
      const cliente = dataClientes.clientes.find((c: any) =>
        c.nombre.toLowerCase().includes(clienteNombre.toLowerCase())
      );

      if (!cliente) {
        alert('Cliente no encontrado. Créalo primero en Cuentas Corrientes.');
        return;
      }

      cliente_id = cliente.id;
    }

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursal_id: sucursalSeleccionada,
          items: carrito,
          tipo_venta: tipoVenta ? 'contado' : 'fiado',
          cliente_id: cliente_id,
          monto_pagado: tipoVenta ? totalCarrito : 0
        })
      });

      const data = await res.json();
      if (data.success) {
        if (tipoVenta) {
          alert(`✅ Venta #${data.venta_id} registrada. Total: $${data.total}`);
        } else {
          alert(`✅ Venta #${data.venta_id} registrada A CRÉDITO. Total: $${data.total}`);
        }
        const quiereTicket = confirm('¿Deseas imprimir el ticket de esta venta?');
        if (quiereTicket && data.venta_id) {
          window.open(`/ticket/${data.venta_id}`, '_blank');
        }
        setCarrito([]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al finalizar venta');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header Compacto */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center gap-4">
            {/* Título y navegación */}
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-blue-600">
                🧼 Punto de Venta
              </h1>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/dashboard"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                >
                  📊 Dashboard
                </Link>
                <Link
                  href="/clientes"
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                >
                  💳 Cuentas
                </Link>
                <Link
                  href="/presupuestos"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                >
                  📄 Presupuestos
                </Link>
                <Link
                  href="/inventario"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                >
                  📦 Inventario
                </Link>
              </div>
            </div>

            {/* Sucursal + Logout */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">📍</span>
                <select
                  className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  value={sucursalSeleccionada}
                  onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={cerrarSesion}
                className="text-red-500 hover:text-red-600 text-xs font-medium"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Panel Izquierdo: Seleccionar Productos */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              📦 Selecciona un Producto
            </h2>

            {/* Buscador de productos */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl">
                🔍
              </span>
              <input
                type="text"
                className="w-full p-2 pl-10 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Buscar producto..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
              />
              {busquedaProducto && (
                <button
                  onClick={() => setBusquedaProducto('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Grid de tarjetas de productos - más alto y simplificado */}
            <div className="max-h-[500px] overflow-y-auto border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
              {productosFiltrados.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {busquedaProducto ? 'No se encontraron productos' : 'Cargando productos...'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {productosFiltrados.map(p => {
                    const stockProducto = getStockProducto(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => abrirModalProducto(p.id)}
                        className="cursor-pointer rounded-lg p-3 transition-all duration-150 border-2 bg-white border-gray-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50"
                      >
                        <h3 className="font-bold text-sm text-gray-800 mb-1">
                          {p.nombre}
                        </h3>
                        <div className="text-xs space-y-0.5">
                          <p className="text-gray-500">
                            ${p.precio_minorista}/L • May: ${p.precio_mayorista}/L
                          </p>
                          <p className={`font-medium ${stockProducto > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            📦 {stockProducto.toFixed(1)} L
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Carrito */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🛒 Carrito de Venta
            </h2>

            {carrito.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                El carrito está vacío
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {carrito.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">{item.producto_nombre}</p>
                          <p className="text-sm text-gray-600">
                            {item.litros}L × ${item.precio_unitario}/L
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
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800">TOTAL:</span>
                    <span className="text-3xl font-bold text-blue-600">
                      ${totalCarrito.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={guardarPresupuesto}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg mb-3"
                >
                  📄 Guardar como Presupuesto
                </button>

                <button
                  onClick={finalizarVenta}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-xl"
                >
                  ✅ Finalizar Venta
                </button>

                <button
                  onClick={() => setCarrito([])}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg mt-3"
                >
                  🗑️ Vaciar Carrito
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Modal de Agregar Producto */}
      {modalAbierto && productoSeleccionado !== 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Botón cerrar */}
            <button
              onClick={cerrarModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>

            {/* Info del producto */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {productos.find(p => p.id === productoSeleccionado)?.nombre}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                📦 Stock: {stockActualSeleccionado?.toFixed(1)} L •
                Mayorista desde {productos.find(p => p.id === productoSeleccionado)?.litros_minimo_mayorista}L
              </p>
            </div>

            {/* Tabs Pesos / Litros */}
            <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setModoCalculo('pesos'); setMontoLitros(''); setResultado(null); }}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${modoCalculo === 'pesos'
                    ? 'bg-blue-500 text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                💵 Por Pesos
              </button>
              <button
                onClick={() => { setModoCalculo('litros'); setMontoPesos(''); setResultado(null); }}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${modoCalculo === 'litros'
                    ? 'bg-green-500 text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                🧴 Por Litros
              </button>
            </div>

            {/* Input según modo */}
            {modoCalculo === 'pesos' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto en pesos ($):
                </label>
                <input
                  type="number"
                  autoFocus
                  className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: 1000"
                  value={montoPesos}
                  onChange={(e) => {
                    setMontoPesos(e.target.value);
                    // Calcular automáticamente
                    if (e.target.value && productoSeleccionado) {
                      const monto = parseFloat(e.target.value);
                      if (monto > 0) {
                        fetch('/api/calcular-venta', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            producto_id: productoSeleccionado,
                            monto_pesos: monto
                          })
                        })
                          .then(res => res.json())
                          .then(data => {
                            if (data.success) setResultado(data);
                          });
                      }
                    } else {
                      setResultado(null);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad en litros (L):
                </label>
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  placeholder="Ej: 5"
                  value={montoLitros}
                  onChange={(e) => {
                    setMontoLitros(e.target.value);
                    // Calcular automáticamente
                    if (e.target.value && productoSeleccionado) {
                      const litros = parseFloat(e.target.value);
                      const producto = productos.find(p => p.id === productoSeleccionado);
                      if (litros > 0 && producto) {
                        const esMayorista = litros >= producto.litros_minimo_mayorista;
                        const precioUnitario = esMayorista ? producto.precio_mayorista : producto.precio_minorista;
                        const total = litros * precioUnitario;
                        const ahorro = esMayorista ? litros * (producto.precio_minorista - producto.precio_mayorista) : 0;
                        setResultado({
                          success: true,
                          producto: producto.nombre,
                          litros,
                          precio_por_litro: precioUnitario,
                          tipo_precio: esMayorista ? 'Mayorista' : 'Minorista',
                          total,
                          ahorro
                        });
                      }
                    } else {
                      setResultado(null);
                    }
                  }}
                />
              </div>
            )}

            {/* Resultado */}
            {resultado && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-green-600">
                    {resultado.litros} L
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${resultado.tipo_precio === 'Mayorista'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                    {resultado.tipo_precio}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  ${resultado.precio_por_litro}/L × {resultado.litros}L
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

            {/* Botón agregar */}
            <button
              onClick={agregarAlCarrito}
              disabled={!resultado}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all"
            >
              ➕ Agregar al Carrito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}