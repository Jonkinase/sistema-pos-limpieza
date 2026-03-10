'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import { Producto, Sucursal, Stock, User } from '@/lib/types';

export default function InventarioPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    tipo: 'liquido',
    precio_minorista: '',
    precio_mayorista: '',
    litros_minimo_mayorista: '5',
    stock_actual: '0',
  });

  const handleFormChange = (field: string, value: string) => {
    setFormProducto(prev => ({ ...prev, [field]: value }));
  };

  const recargarDatos = (sucursalId: number) => {
    fetch(`/api/productos?sucursal_id=${sucursalId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProductos(data.productos || []);
          setSucursales(data.sucursales || []);
          setStocks(data.stocks || []);
        }
      });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success || (data.user.rol !== 'admin' && data.user.rol !== 'encargado')) {
          router.push('/');
        } else {
          setUser(data.user);
          if (data.user.rol !== 'admin' && data.user.sucursal_id) setSucursalSeleccionada(data.user.sucursal_id);
        }
      })
      .catch(() => router.push('/'));

    fetch('/api/stock')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSucursales(data.sucursales || []);
          const initial = sucursalSeleccionada ?? (data.sucursales?.[0]?.id || null);
          if (initial) {
            setSucursalSeleccionada(initial);
            recargarDatos(initial);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (sucursalSeleccionada) recargarDatos(sucursalSeleccionada);
  }, [sucursalSeleccionada]);

  const obtenerConfig = (pId: number) => stocks.find(s => s.producto_id === pId && s.sucursal_id === sucursalSeleccionada);

  const handleSave = async () => {
    if (!formProducto.nombre || !formProducto.precio_minorista) return alert('Campos obligatorios');
    setGuardando(true);
    try {
      if (isEditing && productoEditando) {
        await fetch('/api/productos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productoEditando.id, nombre: formProducto.nombre, tipo: formProducto.tipo, litros_minimo_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.litros_minimo_mayorista) : null })
        });
        await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: productoEditando.id,
            sucursal_id: sucursalSeleccionada,
            cantidad_litros: parseFloat(formProducto.stock_actual),
            precio_minorista: parseFloat(formProducto.precio_minorista),
            precio_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.precio_mayorista || formProducto.precio_minorista) : parseFloat(formProducto.precio_minorista),
            activo: 1
          })
        });
      } else {
        await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formProducto.nombre,
            tipo: formProducto.tipo,
            precio_minorista: parseFloat(formProducto.precio_minorista),
            precio_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.precio_mayorista || formProducto.precio_minorista) : (formProducto.tipo === 'alimento' ? parseFloat(formProducto.precio_minorista) : null),
            litros_minimo_mayorista: formProducto.tipo === 'liquido' ? parseFloat(formProducto.litros_minimo_mayorista) : null,
            stock_inicial: parseFloat(formProducto.stock_actual || '0'),
            sucursal_id: sucursalSeleccionada
          })
        });
      }
      alert('Operación exitosa'); setModalFormOpen(false); recargarDatos(sucursalSeleccionada!);
    } catch (e) { alert('Error al guardar'); }
    setGuardando(false);
  };

  const productosFiltrados = productos
    .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (filtroTipo === 'todos' || (filtroTipo === 'liquido' && (p.tipo === 'liquido' || !p.tipo)) || p.tipo === filtroTipo))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="📦 Inventario / Stock" subtitle="Gestiona el stock por producto y sucursal.">
          <div className="flex flex-wrap gap-2 w-full mt-4">
            <Input className="flex-1 min-w-[140px]" placeholder="🔍 Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <Select className="flex-1 min-w-[140px]" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              <option value="liquido">Solo Líquidos</option>
              <option value="alimento">Solo Alimentos</option>
              <option value="seco">Solo Secos</option>
            </Select>
            <Button variant="success" className="flex-1 min-w-[140px]" onClick={() => { setIsEditing(false); setFormProducto({ nombre: '', tipo: 'liquido', precio_minorista: '', precio_mayorista: '', litros_minimo_mayorista: '5', stock_actual: '0' }); setModalFormOpen(true); }}>➕ Nuevo Producto</Button>
            <Link href="/" className="flex-1 min-w-[140px]"><Button variant="primary" className="w-full">← Volver</Button></Link>
          </div>
        </Card>

        <Card className="mt-6" title="Listado de Productos">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <Select label="Sucursal" value={sucursalSeleccionada ?? ''} onChange={e => setSucursalSeleccionada(Number(e.target.value))} disabled={user?.rol !== 'admin'}>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
            <div className="text-right text-sm text-gray-500">{productosFiltrados.length} productos</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-emerald-50 text-xs sm:text-sm">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Producto</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">P. Minorista</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">P. Mayorista</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Stock</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {productosFiltrados.map(p => {
                  const config = obtenerConfig(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 font-medium">{p.nombre}</td>
                      <td className="px-4 py-2 capitalize">{p.tipo || 'Líquido'}</td>
                      <td className="px-4 py-2 text-right font-bold">${Number(config?.precio_minorista || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-bold">{config?.precio_mayorista ? `$${Number(config.precio_mayorista).toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-700">
                        {p.tipo === 'seco' ? Math.floor(config?.cantidad_litros || 0) : (config?.cantidad_litros || 0).toFixed(2)}
                        <span className="text-xs ml-1 text-gray-400 font-normal">{p.tipo === 'seco' ? 'u.' : (p.tipo === 'alimento' ? 'kg' : 'L')}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="primary" size="sm" className="mr-2" onClick={() => { 
                          setIsEditing(true); setProductoEditando(p);
                          setFormProducto({
                            nombre: p.nombre, tipo: p.tipo || 'liquido', 
                            precio_minorista: (config?.precio_minorista || 0).toString(),
                            precio_mayorista: (config?.precio_mayorista || 0).toString(),
                            litros_minimo_mayorista: (p.litros_minimo_mayorista || 5).toString(),
                            stock_actual: (config?.cantidad_litros || 0).toString()
                          });
                          setModalFormOpen(true);
                        }}>✏️</Button>
                        <Button variant="danger" size="sm" onClick={async () => {
                          if (confirm(`¿Eliminar ${p.nombre}?`)) {
                            const res = await fetch(`/api/productos?id=${p.id}`, { method: 'DELETE' });
                            if ((await res.json()).success) recargarDatos(sucursalSeleccionada!);
                          }
                        }}>🗑️</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {modalFormOpen && (
          <InventoryForm 
            isOpen={modalFormOpen} 
            onClose={() => setModalFormOpen(false)} 
            isEditing={isEditing} 
            sucursales={sucursales} 
            sucursalSeleccionada={sucursalSeleccionada} 
            formProducto={formProducto} 
            onFormChange={handleFormChange} 
            onSave={handleSave} 
            loading={guardando} 
          />
        )}
      </div>
    </div>
  );
}
