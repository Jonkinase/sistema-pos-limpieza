import { Producto, Sucursal, Stock, Cliente, Venta, User, CalculationResult } from '../types';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('No autorizado');
    }
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'Error en la petición');
  }

  const data = await res.json();
  if (data.success === false) {
    throw new Error(data.error || 'Operación fallida');
  }
  return data;
}

export const api = {
  auth: {
    me: () => apiFetch<{ success: boolean; user: User }>('/api/auth/me'),
    logout: () => apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  },
  sucursales: {
    getAll: () => apiFetch<{ success: boolean; sucursales: Sucursal[] }>('/api/sucursales'),
  },
  productos: {
    getAll: (sucursalId: number) => apiFetch<{ success: boolean; productos: Producto[]; stocks: Stock[] }>(`/api/productos?sucursal_id=${sucursalId}`),
    create: (data: Partial<Producto> & { stock_inicial: number, precio_minorista: number, precio_mayorista: number | null }) => apiFetch<{ success: boolean }>('/api/productos', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: Partial<Producto>) => apiFetch<{ success: boolean }>('/api/productos', { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<{ success: boolean }>(`/api/productos?id=${id}`, { method: 'DELETE' }),
  },
  stock: {
    getAll: () => apiFetch<{ success: boolean; sucursales: Sucursal[]; stocks: Stock[] }>('/api/stock'),
    update: (data: Partial<Stock>) => apiFetch<{ success: boolean; stock: Stock }>('/api/stock', { method: 'POST', body: JSON.stringify(data) }),
  },
  clientes: {
    getAll: (sucursalId: number) => apiFetch<{ success: boolean; clientes: Cliente[] }>(`/api/clientes?sucursal_id=${sucursalId}`),
  },
  ventas: {
    getAll: (sucursalId: number, desde: string, hasta: string) => apiFetch<{ success: boolean; ventas: Venta[] }>(`/api/ventas?sucursal_id=${sucursalId}&fecha_desde=${desde}&fecha_hasta=${hasta}`),
    getById: (id: number) => apiFetch<{ success: boolean; venta: Venta; items: unknown[] }>(`/api/ventas/${id}`),
    create: (data: unknown) => apiFetch<{ success: boolean; venta_id: number }>('/api/ventas', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<{ success: boolean }>(`/api/ventas?id=${id}`, { method: 'DELETE' }),
  },
  presupuestos: {
    getById: (id: string | number) => apiFetch<{ success: boolean; presupuesto: unknown; detalles: unknown[] }>(`/api/presupuestos/${id}`),
    create: (data: unknown) => apiFetch<{ success: boolean; presupuesto_id: number }>('/api/presupuestos', { method: 'POST', body: JSON.stringify(data) }),
  },
  calcularVenta: (data: { producto_id: number; monto_pesos: number; sucursal_id: number }) => 
    apiFetch<CalculationResult & { success: boolean }>('/api/calcular-venta', { method: 'POST', body: JSON.stringify(data) })
};
