import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { User, Sucursal } from '../../lib/types';

interface POSHeaderProps {
  user: User | null;
  sucursales: Sucursal[];
  sucursalSeleccionada: number | null;
  onSucursalChange: (id: number) => void;
  onLogout: () => void;
}

export const POSHeader = ({
  user,
  sucursales,
  sucursalSeleccionada,
  onSucursalChange,
  onLogout,
}: POSHeaderProps) => {
  const isAdmin = user?.rol === 'admin';
  const isEncargado = user?.rol === 'encargado';
  const canManage = isAdmin || isEncargado;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-blue-600">🧼 Punto de Venta</h1>
          <div className="flex gap-2 flex-wrap">
            {canManage && (
              <>
                <Link href="/dashboard">
                  <Button variant="primary" size="sm" className="bg-indigo-500 hover:bg-indigo-600">📊 Dashboard</Button>
                </Link>
                <Link href="/usuarios">
                  <Button variant="primary" size="sm" className="bg-gray-700 hover:bg-gray-800">👥 Usuarios</Button>
                </Link>
                <Link href="/clientes">
                  <Button variant="primary" size="sm" className="bg-purple-500 hover:bg-purple-600">💳 Cuentas</Button>
                </Link>
                <Link href="/inventario">
                  <Button variant="primary" size="sm" className="bg-emerald-500 hover:bg-emerald-600">📦 Inventario</Button>
                </Link>
                <Link href="/configuracion">
                  <Button variant="primary" size="sm" className="bg-gray-600 hover:bg-gray-700">⚙️ Configuración</Button>
                </Link>
              </>
            )}
            <Link href="/presupuestos">
              <Button variant="primary" size="sm" className="bg-orange-500 hover:bg-orange-600">📄 Presupuestos</Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">📍</span>
            <Select
              className={`w-auto p-1 text-base ${!isAdmin ? 'opacity-70 pointer-events-none bg-gray-200' : ''}`}
              value={sucursalSeleccionada ?? ''}
              onChange={(e) => onSucursalChange(Number(e.target.value))}
              disabled={!isAdmin || sucursalSeleccionada === null}
            >
              {sucursalSeleccionada === null && <option value="">Cargando...</option>}
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              Hola, {user?.nombre || '...'} ({user?.rol === 'admin' ? 'Admin' : (user?.rol === 'encargado' ? 'Encargado' : 'Vendedor')})
            </span>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-600 text-xs font-medium"
            >
              (Salir)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
