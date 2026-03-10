'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { POSHeader } from '@/components/pos/POSHeader';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { Cart } from '@/components/pos/Cart';
import { ProductModal } from '@/components/pos/ProductModal';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SalesTable from '@/components/SalesTable';
import { api } from '@/lib/api';
import { usePOSStore } from '@/lib/stores/posStore';
import { CalculationResult, Venta } from '@/lib/types';

function PuntoDeVentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const {
    sucursalSeleccionada, setSucursalSeleccionada,
    carrito, setCarrito, addToCart, clearCart,
    idVentaEditando, setIdVentaEditando,
    idPresupuestoConvertiendo, setIdPresupuestoConvertiendo,
    clienteSeleccionado, setClienteSeleccionado,
    tipoVenta, setTipoVenta, resetVenta
  } = usePOSStore();

  const [productoSeleccionado, setProductoSeleccionado] = useState<number>(0);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [montoPesos, setMontoPesos] = useState<string>('');
  const [montoLitros, setMontoLitros] = useState<string>('');
  const [resultado, setResultado] = useState<CalculationResult | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<'pesos' | 'litros'>('pesos');
  const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0);

  const [modalItemRapidoAbierto, setModalItemRapidoAbierto] = useState(false);
  const [nombreItemRapido, setNombreItemRapido] = useState('');
  const [precioItemRapido, setPrecioItemRapido] = useState('');

  // Queries
  const { data: authData, isError: isAuthError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.auth.me,
    retry: false
  });
  const user = authData?.user || null;

  if (isAuthError) {
    router.push('/login');
  }

  const { data: sucursalesData } = useQuery({
    queryKey: ['sucursales'],
    queryFn: api.sucursales.getAll,
    enabled: !!user
  });
  const sucursales = sucursalesData?.sucursales || [];

  useEffect(() => {
    if (user && sucursales.length > 0 && !sucursalSeleccionada) {
      if (user.rol !== 'admin' && user.sucursal_id) {
        setSucursalSeleccionada(user.sucursal_id);
      } else {
        setSucursalSeleccionada(sucursales[0].id);
      }
    }
  }, [user, sucursales, sucursalSeleccionada, setSucursalSeleccionada]);

  const { data: productosData } = useQuery({
    queryKey: ['productos', sucursalSeleccionada, salesRefreshTrigger],
    queryFn: () => api.productos.getAll(sucursalSeleccionada!),
    enabled: !!sucursalSeleccionada
  });
  const productos = productosData?.productos || [];
  const stocks = productosData?.stocks || [];

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', sucursalSeleccionada, salesRefreshTrigger],
    queryFn: () => api.clientes.getAll(sucursalSeleccionada!),
    enabled: !!sucursalSeleccionada
  });
  const clientes = clientesData?.clientes || [];

  // Mutations
  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => router.push('/login'),
    onError: () => toast.error('Error al cerrar sesión')
  });

  const calcularVentaMutation = useMutation({
    mutationFn: api.calcularVenta,
    onSuccess: (data) => setResultado(data),
    onError: (err: Error) => toast.error(err.message || 'Error al calcular')
  });

  const guardarPresupuestoMutation = useMutation({
    mutationFn: api.presupuestos.create,
    onSuccess: (data) => {
      toast.success(`Presupuesto #${data.presupuesto_id} guardado correctamente`);
      clearCart();
    },
    onError: (err: Error) => toast.error(err.message || 'Error al guardar presupuesto')
  });

  const finalizarVentaMutation = useMutation({
    mutationFn: api.ventas.create,
    onSuccess: (data) => {
      toast.success('Venta realizada con éxito');
      if (data.venta_id && confirm('Venta realizada, ¿desea imprimir ticket?')) {
        window.open(`/ticket/${data.venta_id}`, '_blank');
      }
      resetVenta();
      setSalesRefreshTrigger(p => p + 1);
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Error al finalizar venta')
  });

  const eliminarVentaMutation = useMutation({
    mutationFn: api.ventas.delete,
    onError: (err: Error) => toast.error(err.message || 'Error al revertir venta original')
  });

  useEffect(() => {
    const presupuestoId = searchParams.get('convertir_presupuesto');
    if (presupuestoId && !idPresupuestoConvertiendo && sucursalSeleccionada) {
      api.presupuestos.getById(presupuestoId).then(data => {
        if (data.success) {
          const { presupuesto, detalles } = data;
          const cliente = clientes.find(c => c.nombre.toLowerCase() === (presupuesto as {cliente_nombre: string}).cliente_nombre?.toLowerCase());
          if (cliente) setClienteSeleccionado(cliente.id);
          setCarrito(detalles.map((item: unknown) => {
            const i = item as {
            producto_id: number;
            producto_nombre: string;
            cantidad_litros: string;
            precio_unitario: string;
            subtotal: string;
            tipo_precio?: string;
            producto_tipo?: string;
            litros_minimo_mayorista?: number;
          };
            return {
              producto_id: i.producto_id,
              producto_nombre: i.producto_nombre,
              litros: parseFloat(i.cantidad_litros),
              precio_unitario: parseFloat(i.precio_unitario),
              subtotal: parseFloat(i.subtotal),
              tipo_precio: i.tipo_precio || 'Minorista'
            };
          }));
          setIdPresupuestoConvertiendo((presupuesto as {id: number}).id);
          setSucursalSeleccionada((presupuesto as {sucursal_id: number}).sucursal_id);
          router.replace('/', { scroll: false });
          toast.success('Presupuesto cargado para conversión');
        }
      }).catch(() => toast.error('Error al cargar presupuesto'));
    }
  }, [searchParams, sucursalSeleccionada, clientes, idPresupuestoConvertiendo, router, setCarrito, setClienteSeleccionado, setIdPresupuestoConvertiendo, setSucursalSeleccionada]);

  const calculateAuto = (pId: number, mPesos?: string, mLitros?: string, modo?: 'pesos' | 'litros') => {
    const activeModo = modo || modoCalculo;
    const prod = productos.find(p => p.id === pId);
    if (!prod || !sucursalSeleccionada) return;

    if (prod.tipo === 'seco') {
      const qty = parseFloat(mLitros || '0');
      const stock = stocks.find(s => s.producto_id === pId && s.sucursal_id === sucursalSeleccionada);
      const price = stock?.precio_minorista ?? 0;
      if (qty > 0) {
        setResultado({
          success: true,
          producto: prod.nombre,
          litros: qty,
          precio_por_litro: price,
          tipo_precio: 'Unidad',
          total: qty * price,
          ahorro: 0,
          isDry: true
        });
      } else setResultado(null);
      return;
    }

    if (activeModo === 'pesos') {
      const monto = parseFloat(mPesos || '0');
      if (monto > 0) {
        calcularVentaMutation.mutate({ producto_id: pId, monto_pesos: monto, sucursal_id: sucursalSeleccionada });
      } else setResultado(null);
    } else {
      const litros = parseFloat(mLitros || '0');
      const stock = stocks.find(s => s.producto_id === pId && s.sucursal_id === sucursalSeleccionada);
      const pMin = stock?.precio_minorista ?? 0;
      const pMaj = stock?.precio_mayorista ?? 0;
      if (litros > 0) {
        const isMaj = prod.tipo !== 'alimento' && litros >= (prod.litros_minimo_mayorista || 0);
        const price = isMaj ? pMaj : pMin;
        setResultado({
          success: true,
          producto: prod.nombre,
          litros,
          precio_por_litro: price,
          tipo_precio: prod.tipo === 'alimento' ? 'Kg' : (isMaj ? 'Mayorista' : 'Minorista'),
          total: litros * price,
          ahorro: isMaj ? litros * (pMin - pMaj) : 0
        });
      } else setResultado(null);
    }
  };

  const handleEditSale = async (venta: Venta) => {
    if (carrito.length > 0 && !confirm('¿Descartar carrito actual?')) return;
    try {
      const data = await api.ventas.getById(venta.id);
      if (data.success) {
        setCarrito(data.items.map((item: unknown) => {
          const i = item as {
            producto_id: number;
            producto_nombre: string;
            cantidad_litros: string;
            precio_unitario: string;
            subtotal: string;
            tipo_precio?: string;
            producto_tipo?: string;
            litros_minimo_mayorista?: number;
          };
          return {
            producto_id: i.producto_id,
            producto_nombre: i.producto_nombre,
            litros: parseFloat(i.cantidad_litros),
            precio_unitario: parseFloat(i.precio_unitario),
            subtotal: parseFloat(i.subtotal),
            tipo_precio: i.producto_tipo === 'seco' ? 'Unidad' : (i.producto_tipo === 'alimento' ? 'Kg' : (parseFloat(i.cantidad_litros) >= (i.litros_minimo_mayorista || 0) ? 'Mayorista' : 'Minorista'))
          };
        }));
        setSucursalSeleccionada(data.venta.sucursal_id);
        setIdVentaEditando(data.venta.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info(`Editando venta #${data.venta.id}`);
      }
    } catch { toast.error('Error al cargar la venta para editar'); }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
        toast.error('El carrito está vacío');
        return;
    }
    if (!sucursalSeleccionada) return;

    if (idVentaEditando) {
      try {
        await eliminarVentaMutation.mutateAsync(idVentaEditando);
      } catch {
          return; // Detenemos la venta si no se puede revertir la original
      }
    }
    
    finalizarVentaMutation.mutate({
      sucursal_id: sucursalSeleccionada,
      items: carrito,
      tipo_venta: tipoVenta,
      cliente_id: clienteSeleccionado,
      monto_pagado: tipoVenta === 'contado' ? carrito.reduce((s, i) => s + i.subtotal, 0) : 0,
      presupuesto_id: idPresupuestoConvertiendo
    });
  };

  const handleGuardarPresupuesto = () => {
      if (carrito.length === 0) {
          toast.error('El carrito está vacío');
          return;
      }
      const nombre = prompt('Nombre del cliente para el presupuesto:'); 
      if (!nombre) return;

      guardarPresupuestoMutation.mutate({
          sucursal_id: sucursalSeleccionada,
          cliente_nombre: nombre,
          items: carrito
      });
  };

  const handleAddQuickItem = () => {
      if (!nombreItemRapido || !precioItemRapido) {
          toast.error('Ingresa nombre y precio');
          return;
      }
      addToCart({ 
          producto_id: 0, 
          producto_nombre: nombreItemRapido, 
          litros: 1, 
          precio_unitario: parseFloat(precioItemRapido), 
          subtotal: parseFloat(precioItemRapido), 
          tipo_precio: 'Varios' 
      });
      setModalItemRapidoAbierto(false); 
      setNombreItemRapido(''); 
      setPrecioItemRapido('');
      toast.success('Item rápido agregado');
  };

  const handleProductModalAdd = () => {
      if (!resultado) return;
      addToCart({ 
          producto_id: productoSeleccionado, 
          producto_nombre: resultado.producto, 
          litros: resultado.litros, 
          precio_unitario: resultado.precio_por_litro, 
          subtotal: resultado.total, 
          tipo_precio: resultado.tipo_precio 
      });
      setModalAbierto(false);
      toast.success('Producto agregado al carrito');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        <POSHeader 
          user={user} 
          sucursales={sucursales} 
          sucursalSeleccionada={sucursalSeleccionada} 
          onSucursalChange={id => { if (carrito.length > 0 && !confirm('¿Vaciar carrito?')) return; clearCart(); setSucursalSeleccionada(id); }}
          onLogout={() => logoutMutation.mutate()}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductGrid 
            productos={productos} 
            stocks={stocks} 
            sucursalSeleccionada={sucursalSeleccionada} 
            busquedaProducto={busquedaProducto}
            onBusquedaChange={setBusquedaProducto}
            onProductClick={id => { setProductoSeleccionado(id); setMontoPesos(''); setMontoLitros(''); setResultado(null); setModoCalculo('pesos'); setModalAbierto(true); }}
            onQuickItemClick={() => setModalItemRapidoAbierto(true)}
          />

          <Cart 
            carrito={carrito} 
            idVentaEditando={idVentaEditando} 
            clienteSeleccionado={clienteSeleccionado}
            tipoVenta={tipoVenta}
            clientes={clientes}
            onCancelEdit={() => { setIdVentaEditando(null); clearCart(); }}
            onClearCart={clearCart}
            onClienteChange={id => { setClienteSeleccionado(id); if (id === null) setTipoVenta('contado'); }}
            onTipoVentaChange={setTipoVenta}
            onGuardarPresupuesto={handleGuardarPresupuesto}
            onFinalizarVenta={finalizarVenta}
          />
        </div>

        {sucursalSeleccionada && (
          <SalesTable 
            sucursalId={sucursalSeleccionada} 
            refreshTrigger={salesRefreshTrigger} 
            userRole={user?.rol} 
            onDeleteSuccess={() => { setSalesRefreshTrigger(p => p + 1); queryClient.invalidateQueries({ queryKey: ['productos'] }); }} 
            onEdit={handleEditSale} 
          />
        )}

        {modalAbierto && (
          <ProductModal 
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
            productoSeleccionado={productoSeleccionado}
            productos={productos}
            stocks={stocks}
            sucursalSeleccionada={sucursalSeleccionada}
            modoCalculo={modoCalculo}
            onModoCalculoChange={m => { setModoCalculo(m); setMontoPesos(''); setMontoLitros(''); setResultado(null); }}
            montoPesos={montoPesos}
            onMontoPesosChange={v => { setMontoPesos(v); calculateAuto(productoSeleccionado, v, undefined, 'pesos'); }}
            montoLitros={montoLitros}
            onMontoLitrosChange={v => { setMontoLitros(v); calculateAuto(productoSeleccionado, undefined, v, 'litros'); }}
            resultado={resultado}
            onAgregarAlCarrito={handleProductModalAdd}
          />
        )}

        <Dialog 
          isOpen={modalItemRapidoAbierto} 
          onClose={() => setModalItemRapidoAbierto(false)} 
          title="✨ Item Rápido"
          footer={<Button variant="primary" onClick={handleAddQuickItem}>➕ Agregar</Button>}
        >
          <div className="space-y-4">
            <Input label="Nombre:" value={nombreItemRapido} onChange={e => setNombreItemRapido(e.target.value)} />
            <Input label="Precio ($):" type="number" value={precioItemRapido} onChange={e => setPrecioItemRapido(e.target.value)} />
          </div>
        </Dialog>
      </div>
    </div>
  );
}

export default function PuntoDeVenta() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">Cargando aplicación...</div>}>
      <PuntoDeVentaContent />
    </Suspense>
  );
}
