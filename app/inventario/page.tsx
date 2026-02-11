'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

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
  precio_minorista: number;
  precio_mayorista: number;
  activo: number;
};

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Estado para búsqueda
  const [busqueda, setBusqueda] = useState('');

  // Filtrar productos
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const eliminarProducto = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de ELIMINAR el producto "${nombre}"?\n\n⚠️ Esta acción no se puede deshacer.`)) {
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        alert('✅ Producto eliminado correctamente');
        recargarTodo();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al eliminar producto');
    }
    setGuardando(false);
  };

  const router = useRouter();

  useEffect(() => {
    // Verificar rol
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success || (data.user.rol !== 'admin' && data.user.rol !== 'encargado')) {
          router.push('/');
        } else {
          setUser(data.user);
          if (data.user.rol !== 'admin' && data.user.sucursal_id) {
            setSucursalSeleccionada(data.user.sucursal_id);
          }
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
            setSucursalSeleccionada(prev => prev ?? data.sucursales[0].id);
          }
        }
      });
  }, []);

  const obtenerConfiguracionSucursal = (producto_id: number, sucursal_id: number) => {
    return stocks.find(
      (s) => s.producto_id === producto_id && s.sucursal_id === sucursal_id
    );
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
    const config = obtenerConfiguracionSucursal(producto_id, sucursal_id);
    const cantidad = config?.cantidad_litros ?? 0;
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

  // ... (previous code)

  // ... (imports remain)

  // Estado para modal de crear producto
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  // Estado para modal de editar producto
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);

  // Producto que se está editando (incluye id y stock actual)
  const [productoEditando, setProductoEditando] = useState<any>(null);

  // Formulario compartido (se usa para crear y editar, aunque las funciones de guardado sean distintas o compartidas)
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    tipo: 'liquido',
    litros_minimo_mayorista: '5',
    stock_actual: '', // Solo usado para editar stock
    activo: 1
  });

  const abrirModalCrear = () => {
    setFormProducto({
      nombre: '',
      tipo: 'liquido',
      precio_mayorista: '',
      litros_minimo_mayorista: '5',
      stock_actual: '0',
      activo: 1
    });
    setModalCrearAbierto(true);
  };

  const abrirModalEditar = (producto: any) => {
    const config = obtenerConfiguracionSucursal(producto.id, sucursalSeleccionada!);
    setProductoEditando(producto);
    setFormProducto({
      nombre: producto.nombre,
      tipo: producto.tipo || 'liquido',
      precio_minorista: (config?.precio_minorista ?? producto.precio_minorista).toString(),
      precio_mayorista: (config?.precio_mayorista ?? producto.precio_mayorista)?.toString() || '',
      litros_minimo_mayorista: producto.litros_minimo_mayorista?.toString() || '5',
      stock_actual: (config?.cantidad_litros ?? 0).toString(),
      activo: config?.activo ?? 1
    });
    setModalEditarAbierto(true);
  };

  const crearProducto = async () => {
    // ... (logic almost same, using formProducto)
    if (!formProducto.nombre || !formProducto.precio_minorista) {
      alert('Nombre y Precio Minorista son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formProducto.nombre,
          tipo: formProducto.tipo,
          precio_minorista: parseFloat(formProducto.precio_minorista),
          precio_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.precio_mayorista || formProducto.precio_minorista) : null,
          litros_minimo_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.litros_minimo_mayorista) : null,
          stock_inicial: parseFloat(formProducto.stock_actual || '0'),
          sucursal_id: sucursalSeleccionada
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Producto creado correctamente');
        setModalCrearAbierto(false);
        recargarTodo();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('Error al crear producto');
    }
    setGuardando(false);
  };

  const guardarEdicion = async () => {
    if (!productoEditando || !sucursalSeleccionada) return;

    setGuardando(true);
    try {
      // 1. Actualizar datos del producto
      const resProd = await fetch('/api/productos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productoEditando.id,
          nombre: formProducto.nombre,
          tipo: formProducto.tipo,
          litros_minimo_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.litros_minimo_mayorista) : null
        })
      });

      // 2. Actualizar Configuración por Sucursal (Stock, Precios, Activo)
      const nuevaCantidad = parseFloat(formProducto.stock_actual);
      const nuevoPrecioMin = parseFloat(formProducto.precio_minorista);
      const nuevoPrecioMay = formProducto.tipo === 'liquido' ? parseFloat(formProducto.precio_mayorista || formProducto.precio_minorista) : nuevoPrecioMin;
      const nuevoActivo = formProducto.activo;

      const resStock = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoEditando.id,
          sucursal_id: sucursalSeleccionada,
          cantidad_litros: nuevaCantidad,
          precio_minorista: nuevoPrecioMin,
          precio_mayorista: nuevoPrecioMay,
          activo: nuevoActivo
        }),
      });
      const dataStock = await resStock.json();
      const stockOk = dataStock.success;

      const dataProd = await resProd.json();

      if (dataProd.success && stockOk) {
        alert('✅ Producto actualizado correctamente');
        setModalEditarAbierto(false);
        recargarTodo();
      } else {
        alert('❌ Error al actualizar datos o stock');
      }

    } catch (error) {
      alert('Error al guardar edición');
    }
    setGuardando(false);
  };

  const recargarTodo = () => {
    fetch('/api/stock')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProductos(data.productos || []);
          setStocks(data.stocks || []);
        }
      });
  };

  const exportarPreciosPDF = () => {
    const doc = new jsPDF();
    const colorNaranja = [243, 156, 18]; // Naranja para el header similar a la imagen
    const colorTexto = [44, 62, 80];

    // Ordenar productos: Líquidos primero, luego Secos, ambos alfabéticamente
    const productosOrdenados = [...productos].sort((a: any, b: any) => {
      const tipoA = a.tipo || 'liquido';
      const tipoB = b.tipo || 'liquido';

      if (tipoA === 'liquido' && tipoB === 'seco') return -1;
      if (tipoA === 'seco' && tipoB === 'liquido') return 1;

      return a.nombre.localeCompare(b.nombre);
    });

    let y = 15;

    const dibujarHeader = (pagina: number) => {
      // Banner que ocupa todo el ancho
      const bannerWidth = 210;
      const bannerHeight = 50; // Altura ajustada para el banner

      try {
        doc.addImage('/banner-listaprecio.png', 'PNG', 0, 0, bannerWidth, bannerHeight);
      } catch (e) {
        console.error('No se pudo cargar el banner', e);
        // Fallback simple si falla la imagen
        doc.setFillColor(colorNaranja[0], colorNaranja[1], colorNaranja[2]);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('CHOPPER LIMPIEZA', 105, 20, { align: 'center' });
      }

      // Headers de la tabla (ajustado para que no tape el banner)
      y = bannerHeight + 10;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, y - 5, 200, y - 5); // Linea superior header tabla

      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Descripcion de Productos', 15, y);
      doc.text('Menor', 160, y, { align: 'right' });
      doc.text('Mayor', 190, y, { align: 'right' });

      doc.line(10, y + 2, 200, y + 2); // Linea inferior header tabla
      y += 8;
    };

    dibujarHeader(1);

    productosOrdenados.forEach((prod: any) => {
      if (y > 280) {
        doc.addPage();
        dibujarHeader(doc.getNumberOfPages());
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Ajustar nombre si es muy largo
      const nombre = prod.nombre.length > 65 ? prod.nombre.substring(0, 62) + '...' : prod.nombre;
      doc.text(nombre, 15, y);

      doc.setFont('helvetica', 'normal');
      doc.text(`$ ${Number(prod.precio_minorista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 160, y, { align: 'right' });

      const precioMayorista = prod.precio_mayorista
        ? `$ ${Number(prod.precio_mayorista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        : '-';
      doc.text(precioMayorista, 190, y, { align: 'right' });

      // Linea divisoria tenue
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(10, y + 2, 200, y + 2);

      y += 7;
    });

    doc.save(`Lista_Precios_Chopper_Limpieza_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header ... */}
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
            <div className="flex gap-2 w-full md:w-auto">
              {/* Buscador */}
              <input
                type="text"
                placeholder="🔍 Buscar producto..."
                className="p-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none w-full md:w-64 text-gray-900"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button
                onClick={abrirModalCrear}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                ➕ Nuevo Producto
              </button>
              <button
                onClick={exportarPreciosPDF}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg whitespace-nowrap"
              >
                📄 Exportar Tabla Precios
              </button>
              <Link
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
              >
                ← Volver a Ventas
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sucursal
              </label>
              <select
                className={`p-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-gray-900 ${user?.rol !== 'admin' ? 'opacity-70 pointer-events-none bg-gray-200' : ''}`}
                value={sucursalSeleccionada ?? ''}
                onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
                disabled={user?.rol !== 'admin'}
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

            <div className="text-right text-sm text-gray-500">
              {productosFiltrados.length} productos encontrados
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    P. Minorista
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    P. Mayorista
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    Stock
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 border-b">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {sucursalSeleccionada === null ? (
                  // ... same empty states
                  <tr><td colSpan={4} className="text-center py-4">Selecciona sucursal</td></tr>
                ) : productos.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">No hay productos</td></tr>
                ) : (
                  productosFiltrados.map((producto: any) => {
                    const config = obtenerConfiguracionSucursal(producto.id, sucursalSeleccionada);
                    const actual = config?.cantidad_litros ?? 0;
                    const pMinorista = config?.precio_minorista ?? producto.precio_minorista;
                    const pMayorista = config?.precio_mayorista ?? producto.precio_mayorista;
                    const estaActivo = config ? config.activo === 1 : true;

                    return (
                      <tr key={producto.id} className={`hover:bg-gray-50 ${!estaActivo ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-4 py-2 text-sm text-gray-800 border-b font-medium">
                          {producto.nombre}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 border-b capitalize">
                          {producto.tipo || 'Líquido'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b font-bold text-gray-700">
                          ${Number(pMinorista).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b font-bold text-gray-700">
                          ${pMayorista ? Number(pMayorista).toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b font-bold text-emerald-700">
                          {producto.tipo === 'seco' ? Math.floor(Number(actual)) : Number(actual).toFixed(2)}
                          <span className="text-gray-400 text-xs ml-1 font-normal">
                            {producto.tipo === 'seco' ? 'u.' : 'L'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-center border-b">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${estaActivo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {estaActivo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-right border-b">
                          <button
                            onClick={() => abrirModalEditar(producto)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-xs mr-2"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(producto.id, producto.nombre)}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs"
                          >
                            🗑️ Eliminar
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

        {/* Modal Crear/Editar (Reutilizamos la estructura visual pero con variables distintas si ayuda a la claridad) */}
        {/* Aquí usaremos UN SOLO bloque de modal renderizado condicionalmente o dos bloques si preferimos. 
            Para simplificar, renderizaré el contenido del formulario que es 90% idéntico.
        */}

        {(modalCrearAbierto || modalEditarAbierto) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in duration-200">
              <button
                onClick={() => { setModalCrearAbierto(false); setModalEditarAbierto(false); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {modalEditarAbierto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Producto</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setFormProducto({ ...formProducto, tipo: 'liquido' })}
                      className={`flex-1 py-2 rounded-lg font-bold border transition-all ${formProducto.tipo === 'liquido'
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      💧 Líquido (Granel)
                    </button>
                    <button
                      onClick={() => setFormProducto({ ...formProducto, tipo: 'seco' })}
                      className={`flex-1 py-2 rounded-lg font-bold border transition-all ${formProducto.tipo === 'seco'
                        ? 'bg-orange-500 text-white border-orange-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      📦 Seco (Unidad)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                  <input
                    type="text"
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                    value={formProducto.nombre}
                    onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })}
                    placeholder={formProducto.tipo === 'liquido' ? 'Ej: Detergente Premium' : 'Ej: Escoba Dura'}
                  />
                </div>

                {/* Stock en modo crear y editar */}
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                  <label className="block text-sm font-bold text-gray-700">
                    Stock {modalEditarAbierto ? 'Actual' : 'Inicial'} ({sucursales.find(s => s.id === sucursalSeleccionada)?.nombre})
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step={formProducto.tipo === 'seco' ? "1" : "0.01"}
                      className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-lg font-bold text-right text-gray-900"
                      value={formProducto.stock_actual || ''}
                      onChange={e => setFormProducto({ ...formProducto, stock_actual: e.target.value })}
                    />
                    <span className="text-gray-500 font-bold">
                      {formProducto.tipo === 'seco' ? 'u.' : 'L'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Precio Minorista</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        className="w-full pl-7 p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        value={formProducto.precio_minorista || ''}
                        onChange={e => setFormProducto({ ...formProducto, precio_minorista: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {formProducto.tipo === 'liquido' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Precio Mayorista</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          className="w-full pl-7 p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                          value={formProducto.precio_mayorista || ''}
                          onChange={e => setFormProducto({ ...formProducto, precio_mayorista: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggle de Activo (Solo Admin) */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium text-gray-700">Habilitar en este local</span>
                  <button
                    onClick={() => {
                      if (user?.rol === 'admin') {
                        setFormProducto({ ...formProducto, activo: formProducto.activo === 1 ? 0 : 1 });
                      } else {
                        alert('Solo los administradores pueden cambiar la disponibilidad de productos en el local.');
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formProducto.activo === 1 ? 'bg-emerald-500' : 'bg-gray-300'} ${user?.rol !== 'admin' ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formProducto.activo === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {formProducto.tipo === 'liquido' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mínimo para Mayorista (Litros)</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                      value={formProducto.litros_minimo_mayorista || ''}
                      onChange={e => setFormProducto({ ...formProducto, litros_minimo_mayorista: e.target.value })}
                    />
                  </div>
                )}

                <button
                  onClick={modalEditarAbierto ? guardarEdicion : crearProducto}
                  disabled={guardando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg mt-4 shadow"
                >
                  {guardando ? 'Guardando...' : (modalEditarAbierto ? '💾 Guardar Cambios' : '✨ Crear Producto')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

