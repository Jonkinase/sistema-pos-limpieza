import { create } from 'zustand';
import { ItemCarrito } from '../types';

interface POSState {
  sucursalSeleccionada: number | null;
  carrito: ItemCarrito[];
  idVentaEditando: number | null;
  idPresupuestoConvertiendo: number | null;
  clienteSeleccionado: number | null;
  tipoVenta: 'contado' | 'fiado';
  
  // Actions
  setSucursalSeleccionada: (id: number | null) => void;
  addToCart: (item: ItemCarrito) => void;
  setCarrito: (items: ItemCarrito[]) => void;
  clearCart: () => void;
  setIdVentaEditando: (id: number | null) => void;
  setIdPresupuestoConvertiendo: (id: number | null) => void;
  setClienteSeleccionado: (id: number | null) => void;
  setTipoVenta: (tipo: 'contado' | 'fiado') => void;
  resetVenta: () => void;
}

export const usePOSStore = create<POSState>((set) => ({
  sucursalSeleccionada: null,
  carrito: [],
  idVentaEditando: null,
  idPresupuestoConvertiendo: null,
  clienteSeleccionado: null,
  tipoVenta: 'contado',

  setSucursalSeleccionada: (id) => set({ sucursalSeleccionada: id }),
  addToCart: (item) => set((state) => ({ carrito: [...state.carrito, item] })),
  setCarrito: (items) => set({ carrito: items }),
  clearCart: () => set({ carrito: [] }),
  setIdVentaEditando: (id) => set({ idVentaEditando: id }),
  setIdPresupuestoConvertiendo: (id) => set({ idPresupuestoConvertiendo: id }),
  setClienteSeleccionado: (id) => set({ clienteSeleccionado: id }),
  setTipoVenta: (tipo) => set({ tipoVenta: tipo }),
  resetVenta: () => set({
    carrito: [],
    clienteSeleccionado: null,
    tipoVenta: 'contado',
    idVentaEditando: null,
    idPresupuestoConvertiendo: null,
  }),
}));
