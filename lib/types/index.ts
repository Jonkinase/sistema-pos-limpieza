export type Producto = {
  id: number;
  nombre: string;
  tipo?: string;
  litros_minimo_mayorista: number;
  sucursal_id?: number;
};

export type Sucursal = {
  id: number;
  nombre: string;
};

export type Stock = {
  id: number;
  producto_id: number;
  sucursal_id: number;
  cantidad_litros: number;
  precio_minorista: number;
  precio_mayorista: number;
  activo: number;
};

export type ItemCarrito = {
  producto_id: number;
  producto_nombre: string;
  litros: number;
  precio_unitario: number;
  subtotal: number;
  tipo_precio: string;
};

export type Cliente = {
  id: number;
  nombre: string;
  saldo_deuda: number;
};

export type Venta = {
    id: number;
    fecha: string;
    total: number;
    tipo_venta: string;
    cliente_nombre: string | null;
    vendedor_nombre: string | null;
    items_count: number;
    items_resumen: string;
    sucursal_id: number;
};

export type User = {
    id: number;
    nombre: string;
    usuario: string;
    rol: 'admin' | 'encargado' | 'vendedor';
    sucursal_id: number | null;
};

export type CalculationResult = {
  success: boolean;
  producto: string;
  litros: number;
  precio_por_litro: number;
  tipo_precio: string;
  total: number;
  ahorro: number;
  isDry?: boolean;
};
