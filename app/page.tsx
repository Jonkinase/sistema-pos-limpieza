'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { POSHeader } from '@/components/pos/POSHeader';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { Cart } from '@/components/pos/Cart';
import { ProductModal } from '@/components/pos/ProductModal';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SalesTable from '@/components/SalesTable';
import { Producto, Sucursal, Stock, ItemCarrito, Cliente, User } from '@/lib/types';

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
  const [resultado, setResultado] = useState<{
    success: boolean;
    producto: string;
    litros: number;
    precio_por_litro: number;
    tipo_precio: string;
    total: number;
    ahorro: number;
    isDry?: boolean;
  } | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<'pesos' | 'litros'>('pesos');
  const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [idVentaEditando, setIdVentaEditando] = useState<number | null>(null);
  const [idPresupuestoConvertiendo, setIdPresupuestoConvertiendo] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'fiado'>('contado');

  const [modalItemRapidoAbierto, setModalItemRapidoAbierto] = useState(false);
  const [nombreItemRapido, setNombreItemRapido] = useState('');
  const [precioItemRapido, setPrecioItemRapido] = useState('');

  const cerrarSesion = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          return fetch('/api/sucursales').then(res => res.json()).then(sucData => {
            const list = sucData.sucursales || [];
            setSucursales(list);
            if (data.user.rol !== 'admin' && data.user.sucursal_id) {
              setSucursalSeleccionada(data.user.sucursal_id);
            } else if (list.length > 0) {
              setSucursalSeleccionada(list[0].id);
            }
          });
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!sucursalSeleccionada) return;
    fetch(`/api/productos?sucursal_id=${sucursalSeleccionada}`)
      .then(res => res.json())
      .then(data => {
        setProductos(data.productos || []);
        setStocks(data.stocks || []);
      });
  }, [sucursalSeleccionada, salesRefreshTrigger]);

  useEffect(() => {
    if (!sucursalSeleccionada) return;
    fetch(`/api/clientes?sucursal_id=${sucursalSeleccionada}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setClientes(data.clientes || []);
      });
  }, [sucursalSeleccionada, salesRefreshTrigger]);

  useEffect(() => {
    const presupuestoId = searchParams.get('convertir_presupuesto');
    if (presupuestoId && !idPresupuestoConvertiendo && sucursalSeleccionada) {
      fetch(`/api/presupuestos/${presupuestoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const { presupuesto, detalles } = data;
            const cliente = clientes.find(c => c.nombre.toLowerCase() === presupuesto.cliente_nombre.toLowerCase());
            if (cliente) setClienteSeleccionado(cliente.id);
            setCarrito(detalles.map((item: any) => ({
              producto_id: item.producto_id,
              producto_nombre: item.producto_nombre,
              litros: parseFloat(item.cantidad_litros),
              precio_unitario: parseFloat(item.precio_unitario),
              subtotal: parseFloat(item.subtotal),
              tipo_precio: item.tipo_precio || 'Minorista'
            })));
            setIdPresupuestoConvertiendo(presupuesto.id);
            setSucursalSeleccionada(presupuesto.sucursal_id);
            router.replace('/', { scroll: false });
          }
        });
    }
  }, [searchParams, sucursalSeleccionada, clientes, idPresupuestoConvertiendo, router]);

  const calculateAuto = (pId: number, mPesos?: string, mLitros?: string, modo?: 'pesos' | 'litros') => {
    const activeModo = modo || modoCalculo;
    const prod = productos.find(p => p.id === pId);
    if (!prod) return;

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
        fetch('/api/calcular-venta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producto_id: pId, monto_pesos: monto, sucursal_id: sucursalSeleccionada })
        }).then(res => res.json()).then(data => data.success && setResultado(data));
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

  const handleEditSale = async (venta: any) => {
    if (carrito.length > 0 && !confirm('¿Descartar carrito actual?')) return;
    try {
      const res = await fetch(`/api/ventas/${venta.id}`);
      const data = await res.json();
      if (data.success) {
        setCarrito(data.items.map((item: any) => ({
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          litros: parseFloat(item.cantidad_litros),
          precio_unitario: parseFloat(item.precio_unitario),
          subtotal: parseFloat(item.subtotal),
          tipo_precio: item.producto_tipo === 'seco' ? 'Unidad' : (item.producto_tipo === 'alimento' ? 'Kg' : (parseFloat(item.cantidad_litros) >= item.litros_minimo_mayorista ? 'Mayorista' : 'Minorista'))
        })));
        setSucursalSeleccionada(data.venta.sucursal_id);
        setIdVentaEditando(data.venta.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) { alert('Error al editar'); }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    try {
      if (idVentaEditando) {
        const del = await fetch(`/api/ventas?id=${idVentaEditando}`, { method: 'DELETE' });
        if (!(await del.json()).success) throw new Error('Error al revertir');
      }
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursal_id: sucursalSeleccionada,
          items: carrito,
          tipo_venta: tipoVenta,
          cliente_id: clienteSeleccionado,
          monto_pagado: tipoVenta === 'contado' ? carrito.reduce((s, i) => s + i.subtotal, 0) : 0,
          presupuesto_id: idPresupuestoConvertiendo
        })
      });
      const data = await res.json();
      if (data.success) {
        if (confirm('Venta realizada, ¿imprimir ticket?') && data.venta_id) window.open(`/ticket/${data.venta_id}`, '_blank');
        setCarrito([]); setClienteSeleccionado(null); setTipoVenta('contado'); setIdVentaEditando(null); setIdPresupuestoConvertiendo(null); setSalesRefreshTrigger(p => p + 1);
      }
    } catch (e) { alert('Error al finalizar'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        <POSHeader 
          user={user} 
          sucursales={sucursales} 
          sucursalSeleccionada={sucursalSeleccionada} 
          onSucursalChange={id => { if (carrito.length > 0 && !confirm('¿Vaciar carrito?')) return; setCarrito([]); setSucursalSeleccionada(id); }}
          onLogout={cerrarSesion}
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
            onCancelEdit={() => { setIdVentaEditando(null); setCarrito([]); }}
            onClearCart={() => setCarrito([])}
            onClienteChange={id => { setClienteSeleccionado(id); if (id === null) setTipoVenta('contado'); }}
            onTipoVentaChange={setTipoVenta}
            onGuardarPresupuesto={async () => {
              const nombre = prompt('Nombre cliente:'); if (!nombre) return;
              const res = await fetch('/api/presupuestos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sucursal_id: sucursalSeleccionada, cliente_nombre: nombre, items: carrito }) });
              if ((await res.json()).success) { alert('Presupuesto guardado'); setCarrito([]); }
            }}
            onFinalizarVenta={finalizarVenta}
          />
        </div>

        {sucursalSeleccionada && (
          <SalesTable 
            sucursalId={sucursalSeleccionada} 
            refreshTrigger={salesRefreshTrigger} 
            userRole={user?.rol} 
            onDeleteSuccess={() => setSalesRefreshTrigger(p => p + 1)} 
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
            onAgregarAlCarrito={() => { setCarrito([...carrito, { producto_id: productoSeleccionado, producto_nombre: resultado.producto, litros: resultado.litros, precio_unitario: resultado.precio_por_litro, subtotal: resultado.total, tipo_precio: resultado.tipo_precio }]); setModalAbierto(false); }}
          />
        )}

        <Dialog 
          isOpen={modalItemRapidoAbierto} 
          onClose={() => setModalItemRapidoAbierto(false)} 
          title="✨ Item Rápido"
          footer={<Button variant="primary" onClick={() => { setCarrito([...carrito, { producto_id: 0, producto_nombre: nombreItemRapido, litros: 1, precio_unitario: parseFloat(precioItemRapido), subtotal: parseFloat(precioItemRapido), tipo_precio: 'Varios' }]); setModalItemRapidoAbierto(false); setNombreItemRapido(''); setPrecioItemRapido(''); }}>➕ Agregar</Button>}
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
