import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { User, Sucursal } from '../../lib/types';

interface UserFormData {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'encargado' | 'vendedor';
  sucursal_id: string;
}

interface UserFormProps {
  currentUser: User | null;
  sucursales: Sucursal[];
  onSave: (data: UserFormData) => void;
  loading: boolean;
}

export const UserForm = ({ currentUser, sucursales, onSave, loading }: UserFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<UserFormData>({
    defaultValues: {
      rol: 'vendedor',
      sucursal_id: currentUser?.rol === 'encargado' ? currentUser.sucursal_id?.toString() : '',
    }
  });

  const rol = watch('rol');

  const onSubmit = (data: UserFormData) => {
    onSave(data);
    reset();
  };

  return (
    <Card title="Nuevo Usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Nombre completo"
          {...register('nombre', { required: 'El nombre es obligatorio' })}
          error={errors.nombre?.message}
        />
        
        <Input
          label="Email"
          type="email"
          placeholder="email@ejemplo.com"
          {...register('email', { 
            required: 'El email es obligatorio',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Email inválido"
            }
          })}
          error={errors.email?.message}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="Mínimo 4 caracteres"
          {...register('password', { 
            required: 'La contraseña es obligatoria',
            minLength: { value: 4, message: 'Mínimo 4 caracteres' }
          })}
          error={errors.password?.message}
        />

        <Select
          label="Rol"
          {...register('rol', { required: 'El rol es obligatorio' })}
          error={errors.rol?.message}
        >
          <option value="vendedor">Vendedor</option>
          {currentUser?.rol === 'admin' && (
            <>
              <option value="encargado">Encargado</option>
              <option value="admin">Administrador</option>
            </>
          )}
        </Select>

        {(rol === 'vendedor' || rol === 'encargado') && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <Select
              label="Asignar Sucursal"
              disabled={currentUser?.rol === 'encargado'}
              className={currentUser?.rol === 'encargado' ? 'bg-gray-100' : 'bg-orange-50 border-orange-200'}
              {...register('sucursal_id', { 
                required: (rol === 'vendedor' || rol === 'encargado') ? 'Debes asignar una sucursal' : false 
              })}
              error={errors.sucursal_id?.message}
            >
              {currentUser?.rol === 'admin' && <option value="">Selecciona una sucursal...</option>}
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ {currentUser?.rol === 'encargado' ? 'Como encargado, tus vendedores se asignan a tu local.' : 'El usuario solo podrá operar en esta sucursal.'}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          variant="success"
        >
          {loading ? 'Creando...' : '✨ Crear Usuario'}
        </Button>
      </form>
    </Card>
  );
};
