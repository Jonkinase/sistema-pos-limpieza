'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  saldo_deuda: number;
};

type Pago = {
  id: number;
  monto: number;
  fecha: string;
  observaciones: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mostrarFormPago, setMostrarFormPago] = useState(false);

  // Formulario nuevo cliente
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  // Formulario pago
  const [montoPago, setMontoPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [descargando, setDescargando] = useState(false);

  // Cargar clientes
  const cargarClientes = () => {
    fetch('/api/clientes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClientes(data.clientes);
        }
      });
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // Crear nuevo cliente
  const crearCliente = async () => {
    if (!nuevoNombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre,
          telefono: nuevoTelefono
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Cliente creado correctamente');
        setNuevoNombre('');
        setNuevoTelefono('');
        setMostrarFormCliente(false);
        cargarClientes();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al crear cliente');
    }
  };

  // Ver detalles de cliente
  const verDetalleCliente = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    
    // Cargar historial de pagos
    try {
      const res = await fetch(`/api/pagos?cliente_id=${cliente.id}`);
      const data = await res.json();
      if (data.success) {
        setPagos(data.pagos);
      }
    } catch (error) {
      console.error('Error al cargar pagos');
    }
  };

  // Registrar pago
  const registrarPago = async () => {
    if (!clienteSeleccionado || !montoPago) {
      alert('Ingresa un monto válido');
      return;
    }

    const monto = parseFloat(montoPago);
    if (monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteSeleccionado.id,
          monto: monto,
          observaciones: observaciones
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Pago registrado. Nuevo saldo: $${data.nuevo_saldo}`);
        setMontoPago('');
        setObservaciones('');
        setMostrarFormPago(false);
        cargarClientes();
        verDetalleCliente({ ...clienteSeleccionado, saldo_deuda: data.nuevo_saldo });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al registrar pago');
    }
  };

  const descargarReporteDeudas = () => {
    setDescargando(true);
    try {
      const url = '/api/reportes/deudas';
      window.open(url, '_blank');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-purple-600 mb-2">
                💳 Cuentas Corrientes
              </h1>
              <p className="text-gray-600">Gestión de clientes y deudas</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={descargarReporteDeudas}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
                disabled={descargando}
              >
                ⬇️ Deudas (Excel)
              </button>
              <Link 
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-sm md:text-base"
              >
                ← Volver a Ventas
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Panel Izquierdo: Lista de Clientes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                👥 Clientes
              </h2>
              <button
                onClick={() => setMostrarFormCliente(!mostrarFormCliente)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
              >
                {mostrarFormCliente ? '✖ Cancelar' : '➕ Nuevo Cliente'}
              </button>
            </div>

            {/* Formulario Nuevo Cliente */}
            {mostrarFormCliente && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Teléfono (opcional)"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                />
                <button
                  onClick={crearCliente}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                  💾 Guardar Cliente
                </button>
              </div>
            )}

            {/* Lista de Clientes */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {clientes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay clientes registrados</p>
              ) : (
                clientes.map(cliente => (
                  <div
                    key={cliente.id}
                    onClick={() => verDetalleCliente(cliente)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      clienteSeleccionado?.id === cliente.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">{cliente.nombre}</p>
                        {cliente.telefono && (
                          <p className="text-sm text-gray-600">📞 {cliente.telefono}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          cliente.saldo_deuda > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${cliente.saldo_deuda.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cliente.saldo_deuda > 0 ? 'Debe' : 'Sin deuda'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel Derecho: Detalle del Cliente */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {!clienteSeleccionado ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">
                  👈 Selecciona un cliente para ver sus detalles
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {clienteSeleccionado.nombre}
                  </h2>
                  {clienteSeleccionado.telefono && (
                    <p className="text-gray-600">📞 {clienteSeleccionado.telefono}</p>
                  )}
                  
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-gray-600 mb-1">Saldo Total:</p>
                    <p className={`text-4xl font-bold ${
                      clienteSeleccionado.saldo_deuda > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ${clienteSeleccionado.saldo_deuda.toFixed(2)}
                    </p>
                  </div>

                  {clienteSeleccionado.saldo_deuda > 0 && (
                    <button
                      onClick={() => setMostrarFormPago(!mostrarFormPago)}
                      className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg"
                    >
                      {mostrarFormPago ? '✖ Cancelar' : '💵 Registrar Pago'}
                    </button>
                  )}
                </div>

                {/* Formulario de Pago */}
                {mostrarFormPago && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6 space-y-3">
                    <input
                      type="number"
                      placeholder="Monto del pago"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Observaciones (opcional)"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                    <button
                      onClick={registrarPago}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      💾 Confirmar Pago
                    </button>
                  </div>
                )}

                {/* Historial de Pagos */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    📜 Historial de Pagos
                  </h3>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {pagos.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No hay pagos registrados
                      </p>
                    ) : (
                      pagos.map(pago => (
                        <div key={pago.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-green-600">${pago.monto.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(pago.fecha).toLocaleString('es-AR')}
                              </p>
                              {pago.observaciones && (
                                <p className="text-sm text-gray-600 mt-1">{pago.observaciones}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}