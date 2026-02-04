'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

type ItemCarrito = {
  producto_id: number;
  producto_nombre: string;
  litros: number;
  precio_unitario: number;
  subtotal: number;
  tipo_precio: string;
};

export default function PuntoDeVenta() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number>(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number>(0);
  const [montoPesos, setMontoPesos] = useState<string>('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  // Cargar productos y sucursales al inicio
  useEffect(() => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => {
        setProductos(data.productos || []);
        setSucursales(data.sucursales || []);
      });
  }, []);

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
    setResultado(null);
    setMontoPesos('');
    setProductoSeleccionado(0);
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
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-4">
            🧼 Sistema de Limpieza - Punto de Venta
          </h1>
          <div className="flex gap-3 mb-4">
            <Link 
              href="/dashboard"
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg"
            >
              📊 Dashboard
            </Link>
            <Link 
              href="/clientes"
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-lg"
            >
              💳 Cuentas Corrientes
            </Link>
            <Link 
              href="/presupuestos"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg"
            >
              📄 Presupuestos
            </Link>
          </div>
          
          <div className="flex gap-4">
            <label className="flex-1">
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal:
              </span>
              <select 
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
              >
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Panel Izquierdo: Agregar Productos */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Agregar Producto
            </h2>

            <div className="space-y-4">
              <label>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Producto:
                </span>
                <select 
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(Number(e.target.value))}
                >
                  <option value={0}>-- Seleccionar --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Minorista: ${p.precio_minorista}/L | Mayorista: ${p.precio_mayorista}/L)
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Monto en Pesos ($):
                </span>
                <input 
                  type="number"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: 1000"
                  value={montoPesos}
                  onChange={(e) => setMontoPesos(e.target.value)}
                />
              </label>

              <button
                onClick={calcularLitros}
                disabled={calculando}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-300"
              >
                {calculando ? 'Calculando...' : '🔢 Calcular Litros'}
              </button>

              {/* Resultado del Cálculo */}
              {resultado && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-lg font-bold text-green-800">
                    ✅ {resultado.producto}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {resultado.litros} Litros
                  </p>
                  <p className="text-sm text-gray-700">
                    Precio: <span className="font-bold">${resultado.precio_por_litro}/L</span> ({resultado.tipo_precio})
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    Total: ${resultado.total}
                  </p>
                  {resultado.ahorro > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      💰 Ahorro por mayorista: ${resultado.ahorro}
                    </p>
                  )}
                  <button
                    onClick={agregarAlCarrito}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg mt-3"
                  >
                    ➕ Agregar al Carrito
                  </button>
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
    </div>
  );
}