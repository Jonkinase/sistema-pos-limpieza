'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type Producto = {
  id: number;
  nombre: string;
  tipo?: string;
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
  precio_minorista: number;
  precio_mayorista: number;
  activo: number;
};
type ItemCarrito = {
  producto_id: number;
  producto_nombre: string;
  litros: number;
  precio_unitario: number;
  subtotal: number;
  tipo_precio: string;
};

type Cliente = {
  id: number;
  nombre: string;
  saldo_deuda: number;
};

import SalesTable from '@/components/SalesTable';

export default function PuntoDeVenta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number>(0);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [montoPesos, setMontoPesos] = useState<string>('');
  const [montoLitros, setMontoLitros] = useState<string>('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<'pesos' | 'litros'>('pesos');
  const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0);
  const [user, setUser] = useState<any>(null); // State for current user
  const [idVentaEditando, setIdVentaEditando] = useState<number | null>(null);
  const [idPresupuestoConvertiendo, setIdPresupuestoConvertiendo] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null); // null = Consumidor Final
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'fiado'>('contado');

  // Cerrar sesión
  const cerrarSesion = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  // Cargar usuario y datos iniciales
  useEffect(() => {
    // 1. Obtener usuario actual (simulado obteniendo cookies o una ruta de "me")
    // En este caso, podemos decodificar el token o hacer un fetch a una ruta de perfil.
    // Para simplificar y reutilizar, asumiremos que si entra a /usuarios falla es porque no es admin,
    // pero necesitamos saber el rol exacto aquí. 
    // Vamos a crear una pequeña utilidad/fetch inline para obtener el usuario desde el auth_token (via API helper si existiera, o probando acceso).

    // Mejor estrategia: el middleware ya protege, pero necesitamos el dato del rol en el cliente.
    // Vamos a leer la cookie si es posible (no seguro en httpOnly) o hacer una request a un endpoint de session.
    // Por ahora, vamos a confiar en que la API de productos nos deja pasar, y vamos a agregar un endpoint liviano /api/auth/me o similar.
    // O mejor, vamos a inferir del login si lo guardaramos en localStorage, pero por seguridad es mejor server-side.
    // Vamos a agregar un endpoint rápido de "me" o usar el de usuarios filtrado? No, creemos algo simple.

    // WORKAROUND: Vamos a hacer un fetch a api/usuarios (que solo admite admin) para ver si somos admin.
    // Si falla 403, somos vendedor. Pero necesitamos saber la sucursal del vendedor.
    // PLAN UPDATE: Vamos a modificar el login para devolver el usuario y guardarlo en localStorage para uso simple de UI,
    // O vamos a implementar /api/auth/me. Vamos a implementar /api/auth/me inline en este mismo bloque de useEffect llamando a una nueva ruta o...
    // MOMENTO: El login ya devuelve el usuario. Podemos guardarlo en localStorage o Context.
    // Como no tenemos Context global configurado, usaremos una llamada a una nueva ruta /api/auth/me que crearemos ahora mismo.

    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('No session');
      })
      .then(data => {
        if (data.success) {
          setUser(data.user);
          if (data.user.rol !== 'admin' && data.user.sucursal_id) {
            setSucursalSeleccionada(data.user.sucursal_id);
          }
        }
      })
      .catch(() => router.push('/login'));

    fetch('/api/productos')
      .then(res => res.json())
      .then(data => {
        setProductos(data.productos || []);
        setSucursales(data.sucursales || []);
        setStocks(data.stocks || []);
        // Only set default sucursal if none is set (e.g. for admin)
        if (data.sucursales && data.sucursales.length > 0) {
          setSucursalSeleccionada(prev => prev ?? data.sucursales[0].id);
        }
      });

    // Fetch clients
    if (sucursalSeleccionada) {
      fetch(`/api/clientes?sucursal_id=${sucursalSeleccionada}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setClientes(data.clientes || []);
          }
        });
    }

    // Cargar presupuesto si viene por query param
    const presupuestoId = searchParams.get('convertir_presupuesto');
    if (presupuestoId && !idPresupuestoConvertiendo) {
      fetch(`/api/presupuestos/${presupuestoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const { presupuesto, detalles } = data;

            // Si el presupuesto tiene un cliente_nombre, intentar asociarlo
            // NOTA: El sistema asocia por ID, si el presupuesto solo tiene texto, 
            // el usuario deberá seleccionar el cliente manualmente en el carrito.
            // Pero si el cliente existe, podemos pre-seleccionarlo.
            const clienteExistente = clientes.find(c => c.nombre.toLowerCase() === presupuesto.cliente_nombre.toLowerCase());
            if (clienteExistente) setClienteSeleccionado(clienteExistente.id);

            const itemsBudget: ItemCarrito[] = detalles.map((item: any) => ({
              producto_id: item.producto_id,
              producto_nombre: item.producto_nombre,
              litros: parseFloat(item.cantidad_litros),
              precio_unitario: parseFloat(item.precio_unitario),
              subtotal: parseFloat(item.subtotal),
              tipo_precio: item.tipo_precio || 'Minorista'
            }));

            setCarrito(itemsBudget);
            setIdPresupuestoConvertiendo(presupuesto.id);
            setSucursalSeleccionada(presupuesto.sucursal_id);

            // Limpiar el query param para evitar recargas infinitas
            router.replace('/', { scroll: false });
          }
        });
    }
  }, [salesRefreshTrigger, sucursalSeleccionada, searchParams]);

  const stockActualSeleccionado = (() => {
    if (!productoSeleccionado || !sucursalSeleccionada) return null;
    const stock = stocks.find(
      (s) =>
        s.producto_id === productoSeleccionado &&
        s.sucursal_id === sucursalSeleccionada
    );
    return stock?.cantidad_litros ?? 0;
  })();

  // Filtrar productos por búsqueda y disponibilidad en local
  const productosFiltrados = productos.filter(p => {
    const stockConfig = stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada);
    // Si no hay registro de stock para la sucursal, por defecto está activo pero con stock 0 (solo si es nuevo? no, mejor filtrar si activo === 1)
    const estaActivo = stockConfig ? stockConfig.activo === 1 : true;
    return estaActivo && p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase());
  });

  // Obtener stock para cualquier producto en la sucursal actual
  const getStockProducto = (productoId: number) => {
    const stock = stocks.find(
      (s) => s.producto_id === productoId && s.sucursal_id === sucursalSeleccionada
    );
    return stock?.cantidad_litros ?? 0;
  };

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
          monto_pesos: parseFloat(montoPesos),
          sucursal_id: sucursalSeleccionada
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

    // Aplicar lógica mayorista/minorista usando precios DEL LOCAL
    const stockConfig = stocks.find(s => s.producto_id === productoSeleccionado && s.sucursal_id === sucursalSeleccionada);
    const pMinorista = stockConfig?.precio_minorista ?? producto.precio_minorista;
    const pMayorista = stockConfig?.precio_mayorista ?? producto.precio_mayorista;

    const esMayorista = litros >= producto.litros_minimo_mayorista;
    const precioUnitario = esMayorista ? pMayorista : pMinorista;
    const total = litros * precioUnitario;
    const ahorroMayorista = esMayorista ? litros * (pMinorista - pMayorista) : 0;

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

  // Cargar venta para editar
  const handleEditSale = async (venta: any) => {
    if (carrito.length > 0) {
      if (!confirm('¿Deseas descartar el carrito actual para editar esta venta?')) return;
    }

    try {
      const res = await fetch(`/api/ventas/${venta.id}`);
      const data = await res.json();

      if (data.success) {
        const { venta: ventaData, items } = data;

        // Cargar ítems al carrito con el formato correcto
        const itemsEdit: ItemCarrito[] = items.map((item: any) => ({
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          litros: parseFloat(item.cantidad_litros),
          precio_unitario: parseFloat(item.precio_unitario),
          subtotal: parseFloat(item.subtotal),
          tipo_precio: item.producto_tipo === 'seco' ? 'Unidad' : (
            item.producto_tipo === 'alimento' ? 'Kg' : (
              parseFloat(item.cantidad_litros) >= items.find((i: any) => i.id === item.id)?.litros_minimo_mayorista ? 'Mayorista' : 'Minorista'
            )
          )
        }));

        setCarrito(itemsEdit);
        setSucursalSeleccionada(ventaData.sucursal_id);
        setIdVentaEditando(ventaData.id);

        // Scroll al carrito
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Error al cargar venta: ' + data.error);
      }
    } catch (error) {
      alert('Error al intentar editar la venta');
    }
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

    try {
      // Si estamos editando, primero eliminamos la venta anterior
      if (idVentaEditando) {
        console.log(`♻️ Editando venta: Eliminando venta original #${idVentaEditando}`);
        const delRes = await fetch(`/api/ventas?id=${idVentaEditando}`, { method: 'DELETE' });
        const delData = await delRes.json();
        if (!delData.success) {
          throw new Error('No se pudo revertir la venta original: ' + delData.error);
        }
      }

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursal_id: sucursalSeleccionada,
          items: carrito,
          tipo_venta: tipoVenta,
          cliente_id: clienteSeleccionado,
          monto_pagado: tipoVenta === 'contado' ? totalCarrito : 0,
          presupuesto_id: idPresupuestoConvertiendo // Enviar ID del presupuesto para marcar como convertido
        })
      });

      const data = await res.json();
      if (data.success) {
        const quiereTicket = confirm('Venta realizada con exito, desea imprimir ticket?');
        if (quiereTicket && data.venta_id) {
          window.open(`/ticket/${data.venta_id}`, '_blank');
        }

        setCarrito([]);
        setClienteSeleccionado(null); // Reset to Consumidor Final
        setTipoVenta('contado');      // Reset to Contado
        setIdVentaEditando(null); // Reset edit mode
        setIdPresupuestoConvertiendo(null); // Reset budget mode
        setSalesRefreshTrigger(prev => prev + 1); // Refresh sales table and stock
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al finalizar venta');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Modificar renderizado del header y opciones según rol
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
                {(user?.rol === 'admin' || user?.rol === 'encargado') && (
                  <Link
                    href="/dashboard"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                  >
                    📊 Dashboard
                  </Link>
                )}
                {(user?.rol === 'admin' || user?.rol === 'encargado') && (
                  <Link
                    href="/usuarios"
                    className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                  >
                    👥 Usuarios
                  </Link>
                )}
                {(user?.rol === 'admin' || user?.rol === 'encargado') && (
                  <>
                    <Link
                      href="/clientes"
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                    >
                      💳 Cuentas
                    </Link>
                    <Link
                      href="/inventario"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                    >
                      📦 Inventario
                    </Link>
                  </>
                )}
                <Link
                  href="/presupuestos"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm"
                >
                  📄 Presupuestos
                </Link>
              </div>
            </div>

            {/* Sucursal + Logout */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">📍</span>
                <select
                  className={`bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 text-gray-900 ${user?.rol !== 'admin' ? 'opacity-70 pointer-events-none bg-gray-200' : ''}`}
                  value={sucursalSeleccionada ?? ''}
                  onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
                  disabled={user?.rol !== 'admin' || sucursalSeleccionada === null}
                >
                  {sucursalSeleccionada === null && <option value="">Cargando...</option>}
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Hola, {user?.nombre || '...'} ({user?.rol === 'admin' ? 'Admin' : (user?.rol === 'encargado' ? 'Encargado' : 'Vendedor')})
                </span>
                <button
                  onClick={cerrarSesion}
                  className="text-red-500 hover:text-red-600 text-xs font-medium"
                >
                  (Salir)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ... Rest of the POS Grid ... */}


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
                className="w-full p-2 pl-10 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
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
                            {p.tipo === 'seco'
                              ? `$${stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? p.precio_minorista} / u.`
                              : (p.tipo === 'alimento'
                                ? `$${stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? p.precio_minorista}/kg`
                                : `$${stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? p.precio_minorista}/L • May: ${stocks.find(s => s.producto_id === p.id && s.sucursal_id === sucursalSeleccionada)?.precio_mayorista ?? p.precio_mayorista}/L`
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
          </div>

          {/* Panel Derecho: Carrito */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🛒 Carrito de Venta
            </h2>

            {idVentaEditando && (
              <div className="mb-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-800 flex justify-between items-center rounded-r-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  <div>
                    <p className="font-bold text-sm">Modo Edición: Venta #{idVentaEditando}</p>
                    <p className="text-xs">Los cambios reemplazarán la venta original.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIdVentaEditando(null); setCarrito([]); }}
                  className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-900 px-2 py-1 rounded font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            )}

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
                            {item.litros}{item.tipo_precio === 'Unidad' ? 'u' : (item.tipo_precio === 'Kg' ? 'kg' : 'L')} × ${item.precio_unitario}/{item.tipo_precio === 'Unidad' ? 'u' : (item.tipo_precio === 'Kg' ? 'kg' : 'L')}
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
                    {/* Selección de Cliente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        👤 Cliente:
                      </label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                        value={clienteSeleccionado ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newId = val === '' ? null : Number(val);
                          setClienteSeleccionado(newId);
                          // Si vuelve a consumidor final, forzar contado
                          if (newId === null) setTipoVenta('contado');
                        }}
                      >
                        <option value="">Consumidor Final</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tipo de Venta */}
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
                            onChange={() => setTipoVenta('contado')}
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
                            onChange={() => setTipoVenta('fiado')}
                            className="w-4 h-4 text-blue-600"
                          />
                          Fiado
                        </label>
                      </div>
                    </div>
                  </div>

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

        {/* Tabla de Ventas */}
        {sucursalSeleccionada !== null && (
          <SalesTable
            sucursalId={sucursalSeleccionada}
            refreshTrigger={salesRefreshTrigger}
            userRole={user?.rol}
            onDeleteSuccess={() => setSalesRefreshTrigger(prev => prev + 1)}
            onEdit={handleEditSale}
          />
        )}
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
                📦 Stock: {stockActualSeleccionado?.toFixed(1)} {productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? 'kg' : 'L'}
                {productos.find(p => p.id === productoSeleccionado)?.tipo === 'liquido' && (
                  `• Mayorista desde ${productos.find(p => p.id === productoSeleccionado)?.litros_minimo_mayorista}L`
                )}
              </p>
            </div>

            {/* Conditional Render based on Product Type */}
            {productos.find(p => p.id === productoSeleccionado)?.tipo === 'seco' ? (
              <div className="mb-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-sm text-orange-800">
                  📦 Producto por Unidad
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad (Unidades):
                </label>
                <input
                  type="number"
                  step="1"
                  autoFocus
                  className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900"
                  placeholder="Ej: 1"
                  value={montoLitros} // Reusing montoLitros for convenience, logically it's qty
                  onChange={(e) => {
                    setMontoLitros(e.target.value);
                    if (e.target.value && productoSeleccionado) {
                      const qty = parseFloat(e.target.value);
                      const prod = productos.find(p => p.id === productoSeleccionado);
                      if (qty > 0 && prod) {
                        setResultado({
                          success: true,
                          producto: prod.nombre,
                          litros: qty,
                          precio_por_litro: stocks.find(s => s.producto_id === prod.id && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? prod.precio_minorista,
                          tipo_precio: 'Unidad',
                          total: qty * (stocks.find(s => s.producto_id === prod.id && s.sucursal_id === sucursalSeleccionada)?.precio_minorista ?? prod.precio_minorista),
                          ahorro: 0,
                          isDry: true
                        });
                      } else {
                        setResultado(null);
                      }
                    } else {
                      setResultado(null);
                    }
                  }}
                />
              </div>
            ) : (
              <>
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
                    {productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? '🦴 Por Kilos' : '🧴 Por Litros'}
                  </button>
                </div>
              </>
            )}

            {/* Input según modo (Liquid Only) */}
            {productos.find(p => p.id === productoSeleccionado)?.tipo !== 'seco' && (
              modoCalculo === 'pesos' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto en pesos ($):
                  </label>
                  <input
                    type="number"
                    autoFocus
                    className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
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
                              monto_pesos: monto,
                              sucursal_id: sucursalSeleccionada
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
                    {productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? 'Cantidad en kilogramos (kg):' : 'Cantidad en litros (L):'}
                  </label>
                  <input
                    type="number"
                    step={productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? "0.1" : "0.5"}
                    autoFocus
                    className="w-full p-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
                    placeholder={productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? "Ej: 1" : "Ej: 5"}
                    value={montoLitros}
                    onChange={(e) => {
                      setMontoLitros(e.target.value);
                      // Calcular automáticamente
                      if (e.target.value && productoSeleccionado) {
                        const litros = parseFloat(e.target.value);
                        const producto = productos.find(p => p.id === productoSeleccionado);

                        const stockConfig = stocks.find(s => s.producto_id === productoSeleccionado && s.sucursal_id === sucursalSeleccionada);
                        const pMinorista = stockConfig?.precio_minorista ?? producto?.precio_minorista ?? 0;
                        const pMayorista = stockConfig?.precio_mayorista ?? producto?.precio_mayorista ?? pMinorista;

                        if (litros > 0 && producto) {
                          const esMayorista = producto.tipo === 'alimento' ? false : litros >= (producto.litros_minimo_mayorista || 0);
                          const precioUnitario = esMayorista ? pMayorista : pMinorista;
                          const total = litros * precioUnitario;
                          const ahorro = esMayorista ? litros * (pMinorista - pMayorista) : 0;
                          setResultado({
                            success: true,
                            producto: producto.nombre,
                            litros,
                            precio_por_litro: precioUnitario,
                            tipo_precio: producto.tipo === 'alimento' ? 'Kg' : (esMayorista ? 'Mayorista' : 'Minorista'),
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
              )
            )}

            {/* Resultado */}
            {resultado && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-green-600">
                    {resultado.litros} {resultado.isDry ? 'u.' : (productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? 'kg' : 'L')}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${resultado.tipo_precio === 'Mayorista'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                    }`}>
                    {resultado.tipo_precio}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  ${resultado.precio_por_litro}/{resultado.isDry ? 'u' : (productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? 'kg' : 'L')} × {resultado.litros}{resultado.isDry ? 'u' : (productos.find(p => p.id === productoSeleccionado)?.tipo === 'alimento' ? 'kg' : 'L')}
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