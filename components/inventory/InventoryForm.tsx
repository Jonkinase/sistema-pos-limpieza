import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sucursal } from '../../lib/types';

interface InventoryFormData {
  nombre: string;
  tipo: string;
  precio_minorista: number;
  precio_mayorista: number;
  litros_minimo_mayorista: number;
  stock_actual: number;
}

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
  onSave: (data: InventoryFormData) => void;
  loading: boolean;
}

export const InventoryForm = ({
  isOpen,
  onClose,
  isEditing,
  sucursales,
  sucursalSeleccionada,
  formProducto,
  onSave,
  loading,
}: InventoryFormProps) => {
  const sucursalNombre = sucursales.find(s => s.id === sucursalSeleccionada)?.nombre || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<InventoryFormData>({
    defaultValues: {
      nombre: formProducto.nombre,
      tipo: formProducto.tipo,
      precio_minorista: parseFloat(formProducto.precio_minorista) || 0,
      precio_mayorista: parseFloat(formProducto.precio_mayorista) || 0,
      litros_minimo_mayorista: parseFloat(formProducto.litros_minimo_mayorista) || 5,
      stock_actual: parseFloat(formProducto.stock_actual) || 0,
    }
  });

  const tipo = watch('tipo');

  useEffect(() => {
    if (isOpen) {
      reset({
        nombre: formProducto.nombre,
        tipo: formProducto.tipo,
        precio_minorista: parseFloat(formProducto.precio_minorista) || 0,
        precio_mayorista: parseFloat(formProducto.precio_mayorista) || 0,
        litros_minimo_mayorista: parseFloat(formProducto.litros_minimo_mayorista) || 5,
        stock_actual: parseFloat(formProducto.stock_actual) || 0,
      });
    }
  }, [isOpen, formProducto, reset]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      footer={
        <Button 
          variant="success" 
          onClick={handleSubmit(onSave)} 
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
              type="button"
              variant={tipo === 'liquido' ? 'primary' : 'ghost'}
              className="flex-1"
              onClick={() => setValue('tipo', 'liquido')}
            >
              💧 Líquido
            </Button>
            <Button
              type="button"
              variant={tipo === 'alimento' ? 'warning' : 'ghost'}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={() => setValue('tipo', 'alimento')}
            >
              🦴 Alimento
            </Button>
            <Button
              type="button"
              variant={tipo === 'seco' ? 'warning' : 'ghost'}
              className="flex-1"
              onClick={() => setValue('tipo', 'seco')}
            >
              📦 Seco
            </Button>
          </div>
          <input type="hidden" {...register('tipo')} />
        </div>

        <Input
          label="Nombre del Producto"
          placeholder="Ej: Detergente Premium"
          {...register('nombre', { required: 'El nombre es obligatorio' })}
          error={errors.nombre?.message}
        />

        <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
          <label className="block text-sm font-bold text-gray-700">
            Stock {isEditing ? 'Actual' : 'Inicial'} ({sucursalNombre})
          </label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              step={tipo === 'seco' ? "1" : "0.01"}
              className="font-bold text-right"
              {...register('stock_actual', { 
                required: 'El stock es obligatorio',
                min: { value: 0, message: 'El stock no puede ser negativo' },
                valueAsNumber: true
              })}
              error={errors.stock_actual?.message}
            />
            <span className="text-gray-500 font-bold">
              {tipo === 'seco' ? 'u.' : (tipo === 'alimento' ? 'kg' : 'L')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={tipo === 'alimento' ? 'Precio xKg' : 'Precio Minorista'}
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('precio_minorista', { 
              required: 'El precio es obligatorio',
              min: { value: 0, message: 'Mínimo 0' },
              valueAsNumber: true
            })}
            error={errors.precio_minorista?.message}
          />

          {tipo === 'liquido' && (
            <Input
              label="Precio Mayorista"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('precio_mayorista', { 
                min: { value: 0, message: 'Mínimo 0' },
                valueAsNumber: true
              })}
              error={errors.precio_mayorista?.message}
            />
          )}
        </div>

        {tipo === 'liquido' && (
          <Input
            label="Mínimo para Mayorista (Litros)"
            type="number"
            step="0.1"
            {...register('litros_minimo_mayorista', { 
              min: { value: 0, message: 'Mínimo 0' },
              valueAsNumber: true
            })}
            error={errors.litros_minimo_mayorista?.message}
          />
        )}
      </div>
    </Dialog>
  );
};
