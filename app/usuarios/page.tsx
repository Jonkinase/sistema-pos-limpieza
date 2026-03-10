'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserForm } from '@/components/users/UserForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { User, Sucursal } from '@/lib/types';

interface UserFormData {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'encargado' | 'vendedor';
  sucursal_id: string;
}

export default function UsuariosPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: authData, isLoading: authLoading, isError: isAuthError } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: api.auth.me,
        retry: false
    });
    const currentUser = authData?.user || null;

    if (isAuthError) {
        router.push('/login');
    }

    const { data: sucursalesData } = useQuery({
        queryKey: ['sucursales'],
        queryFn: api.sucursales.getAll,
        enabled: !!currentUser
    });
    const sucursales = sucursalesData?.sucursales || [];

    const { data: usuariosData, isLoading: usersLoading } = useQuery({
        queryKey: ['usuarios'],
        queryFn: async () => {
            const res = await fetch('/api/usuarios');
            if (res.status === 401 || res.status === 403) {
                throw new Error('No autorizado');
            }
            return res.json();
        },
        enabled: !!currentUser
    });
    const usuarios = (usuariosData?.usuarios as (User & { sucursal_nombre: string })[]) || [];

    const createUserMutation = useMutation({
        mutationFn: async (data: UserFormData) => {
            const res = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    sucursal_id: (data.rol === 'vendedor' || data.rol === 'encargado') ? Number(data.sucursal_id) : null
                })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            toast.success('Usuario creado correctamente');
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
        },
        onError: (err: Error) => toast.error(err.message || 'Error al crear usuario')
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            toast.success('Usuario eliminado');
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
        },
        onError: (err: Error) => toast.error(err.message || 'Error al eliminar usuario')
    });

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            deleteUserMutation.mutate(id);
        }
    };

    if (authLoading || usersLoading) return <div className="p-8 text-center">Cargando...</div>;

    if (currentUser?.rol !== 'admin' && currentUser?.rol !== 'encargado') {
        toast.error('No tienes permisos');
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">👥 Gestión de Usuarios</h1>
                    <Link href="/">
                        <Button variant="primary">🏠 Volver al Inicio</Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <UserForm 
                        currentUser={currentUser} 
                        sucursales={sucursales} 
                        onSave={(data) => createUserMutation.mutate(data)} 
                        loading={createUserMutation.isPending} 
                    />

                    <Card className="lg:col-span-2" title="Usuarios Registrados">
                        {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                            {usuarios.map(u => (
                                <Card key={u.id} className="!p-4 border border-gray-200 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start pb-2 border-b border-gray-100">
                                            <div>
                                                <p className="font-bold text-gray-900">{u.nombre}</p>
                                                <p className="text-sm text-gray-500">{u.email}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.rol === 'admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {u.rol === 'admin' ? 'Admin' : u.rol === 'encargado' ? 'Encargado' : 'Vendedor'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Sucursal:</span>
                                            <span className="font-medium text-gray-900">{u.sucursal_nombre || '-'}</span>
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 flex justify-end">
                                            <Button 
                                                variant="danger" 
                                                size="sm" 
                                                onClick={() => handleDelete(u.id)}
                                            >
                                                🗑️ Eliminar Usuario
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Rol</th>
                                        <th className="px-4 py-3">Sucursal</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {usuarios.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-gray-900">{u.nombre}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.rol === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {u.rol === 'admin' ? 'Administrador' : u.rol === 'encargado' ? 'Encargado' : 'Vendedor'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {u.sucursal_nombre || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button 
                                                    variant="danger" 
                                                    size="sm" 
                                                    onClick={() => handleDelete(u.id)}
                                                    aria-label="Eliminar usuario"
                                                >
                                                    🗑️
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
