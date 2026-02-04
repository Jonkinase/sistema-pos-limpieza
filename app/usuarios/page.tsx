'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type User = {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    sucursal_id: number | null;
    sucursal_nombre: string | null;
    creado_en: string;
};

type Sucursal = {
    id: number;
    nombre: string;
};

export default function UsuariosPage() {
    const router = useRouter();
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rol, setRol] = useState('vendedor');
    const [sucursalId, setSucursalId] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Cargar sucursales para el form
            const resSuc = await fetch('/api/productos');
            const dataSuc = await resSuc.json();
            setSucursales(dataSuc.sucursales || []);

            // Cargar usuarios
            const resUsers = await fetch('/api/usuarios');
            if (resUsers.status === 401 || resUsers.status === 403) {
                alert('⛔ No tienes permisos para ver esta sección');
                router.push('/');
                return;
            }
            const dataUsers = await resUsers.json();
            if (dataUsers.success) {
                setUsuarios(dataUsers.usuarios);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !email || !password) {
            alert('Todos los campos son obligatorios');
            return;
        }

        if (rol === 'vendedor' && !sucursalId) {
            alert('Debes asignar una sucursal al vendedor');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    email,
                    password,
                    rol,
                    sucursal_id: rol === 'vendedor' ? Number(sucursalId) : null
                })
            });

            const data = await res.json();
            if (data.success) {
                alert('✅ Usuario creado correctamente');
                setNombre('');
                setEmail('');
                setPassword('');
                fetchData(); // Reload list
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al crear usuario');
        }
        setCreating(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            const res = await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setUsuarios(prev => prev.filter(u => u.id !== id));
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al eliminar usuario');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">👥 Gestión de Usuarios</h1>
                    <Link
                        href="/"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        🏠 Volver al Inicio
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Formulario de Creación */}
                    <div className="bg-white rounded-xl shadow-md p-6 h-fit">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Nuevo Usuario</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    minLength={4}
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol</label>
                                <select
                                    className="w-full mt-1 p-2 border rounded-lg bg-white text-gray-900"
                                    value={rol}
                                    onChange={e => setRol(e.target.value)}
                                >
                                    <option value="vendedor">Vendedor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            {rol === 'vendedor' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-medium text-gray-700">Asignar Sucursal</label>
                                    <select
                                        required
                                        className="w-full mt-1 p-2 border-2 border-orange-200 rounded-lg bg-orange-50 text-gray-900"
                                        value={sucursalId}
                                        onChange={e => setSucursalId(e.target.value)}
                                    >
                                        <option value="">Selecciona una sucursal...</option>
                                        {sucursales.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-orange-600 mt-1">
                                        ⚠️ El vendedor solo podrá operar en esta sucursal.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"
                            >
                                {creating ? 'Creando...' : '✨ Crear Usuario'}
                            </button>
                        </form>
                    </div>

                    {/* Lista de Usuarios */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Usuarios Registrados</h2>
                        <div className="overflow-x-auto">
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
                                                    {u.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {u.sucursal_nombre || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                                                    title="Eliminar usuario"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
