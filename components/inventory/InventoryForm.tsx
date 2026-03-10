import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sucursal } from '../../lib/types';

interface InventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  sucursales: Sucursal[];
  sucursalSeleccionada: number | null;
  formProducto: {
    nombre: string;
    tipo: string;
    precio_minorista: string;
    precio_mayorista: string;
    litros_minimo_mayorista: string;
    stock_actual: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
  loading: boolean;
}

export const InventoryForm = ({
  isOpen,
  onClose,
  isEditing,
  sucursales,
  sucursalSeleccionada,
  formProducto,
  onFormChange,
  onSave,
  loading,
}: InventoryFormProps) => {
  const sucursalNombre = sucursales.find(s => s.id === sucursalSeleccionada)?.nombre || '';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      footer={
        <Button 
          variant="success" 
          onClick={onSave} 
          disabled={loading}
        >
          {loading ? 'Guardando...' : (isEditing ? '💾 Guardar Cambios' : '✨ Crear Producto')}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Producto</label>
          <div className="flex gap-2 mt-1">
            <Button
              variant={formProducto.tipo === 'liquido' ? 'primary' : 'ghost'}
              className="flex-1"
              onClick={() => onFormChange('tipo', 'liquido')}
            >
              💧 Líquido
            </Button>
            <Button
              variant={formProducto.tipo === 'alimento' ? 'warning' : 'ghost'}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={() => onFormChange('tipo', 'alimento')}
            >
              🦴 Alimento
            </Button>
            <Button
              variant={formProducto.tipo === 'seco' ? 'warning' : 'ghost'}
              className="flex-1"
              onClick={() => onFormChange('tipo', 'seco')}
            >
              📦 Seco
            </Button>
          </div>
        </div>

        <Input
          label="Nombre del Producto"
          value={formProducto.nombre}
          onChange={e => onFormChange('nombre', e.target.value)}
          placeholder="Ej: Detergente Premium"
        />

        <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
          <label className="block text-sm font-bold text-gray-700">
            Stock {isEditing ? 'Actual' : 'Inicial'} ({sucursalNombre})
          </label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              step={formProducto.tipo === 'seco' ? "1" : "0.01"}
              className="font-bold text-right"
              value={formProducto.stock_actual}
              onChange={e => onFormChange('stock_actual', e.target.value)}
            />
            <span className="text-gray-500 font-bold">
              {formProducto.tipo === 'seco' ? 'u.' : (formProducto.tipo === 'alimento' ? 'kg' : 'L')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={formProducto.tipo === 'alimento' ? 'Precio xKg' : 'Precio Minorista'}
            type="number"
            value={formProducto.precio_minorista}
            onChange={e => onFormChange('precio_minorista', e.target.value)}
            placeholder="0.00"
          />

          {formProducto.tipo === 'liquido' && (
            <Input
              label="Precio Mayorista"
              type="number"
              value={formProducto.precio_mayorista}
              onChange={e => onFormChange('precio_mayorista', e.target.value)}
              placeholder="0.00"
            />
          )}
        </div>

        {formProducto.tipo === 'liquido' && (
          <Input
            label="Mínimo para Mayorista (Litros)"
            type="number"
            value={formProducto.litros_minimo_mayorista}
            onChange={e => onFormChange('litros_minimo_mayorista', e.target.value)}
          />
        )}
      </div>
    </Dialog>
  );
};
