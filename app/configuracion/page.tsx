'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Negocio = {
    nombre: string;
    direccion: string;
    telefono: string;
    cuit: string;
};

type Sucursal = {
    id: number;
    nombre: string;
    direccion: string;
    activo: number;
};

export default function ConfiguracionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [guardandoNegocio, setGuardandoNegocio] = useState(false);
    
    // Datos del Negocio
    const [negocio, setNegocio] = useState<Negocio>({
        nombre: '',
        direccion: '',
        telefono: '',
        cuit: ''
    });

    // Lista de Sucursales
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    
    // Estado para nueva sucursal
    const [mostrarNuevoLocal, setMostrarNuevoLocal] = useState(false);
    const [nuevoLocal, setNuevoLocal] = useState({ nombre: '', direccion: '' });
    const [creandoLocal, setCreandoLocal] = useState(false);

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    const checkAuthAndFetchData = async () => {
        try {
            const resAuth = await fetch('/api/auth/me');
            const dataAuth = await resAuth.json();
            
            if (!dataAuth.success || dataAuth.user.rol !== 'admin') {
                router.push('/');
                return;
            }

            const resConfig = await fetch('/api/configuracion');
            const dataConfig = await resConfig.json();
            
            if (dataConfig.success) {
                setNegocio(dataConfig.negocio || { nombre: '', direccion: '', telefono: '', cuit: '' });
                setSucursales(dataConfig.sucursales || []);
            }
        } catch (error) {
            console.error("Error al cargar configuración:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNegocio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!negocio.nombre) {
            alert('El nombre del negocio es obligatorio');
            return;
        }

        setGuardandoNegocio(true);
        try {
            const res = await fetch('/api/configuracion', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(negocio)
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Datos del negocio actualizados');
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al guardar datos del negocio');
        } finally {
            setGuardandoNegocio(false);
        }
    };

    const handleUpdateSucursal = async (id: number) => {
        const sucursal = sucursales.find(s => s.id === id);
        if (!sucursal) return;

        if (!sucursal.nombre) {
            alert('El nombre de la sucursal es obligatorio');
            return;
        }

        // Si se está desactivando, confirmar
        if (sucursal.activo === 0) {
            const confirmDeactivate = confirm(`¿Desactivar ${sucursal.nombre}? Esto también inactivará todos sus productos y usuarios asignados.`);
            if (!confirmDeactivate) {
                // Revertir localmente si cancela
                setSucursales(prev => prev.map(s => s.id === id ? { ...s, activo: 1 } : s));
                return;
            }
        }

        try {
            const res = await fetch(`/api/configuracion/sucursales/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: sucursal.nombre,
                    direccion: sucursal.direccion,
                    activo: sucursal.activo
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Sucursal actualizada correctamente');
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al actualizar sucursal');
        }
    };

    const handleAddSucursal = async () => {
        if (!nuevoLocal.nombre) {
            alert('El nombre del local es obligatorio');
            return;
        }

        setCreandoLocal(true);
        try {
            const res = await fetch('/api/configuracion/sucursales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoLocal)
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Local agregado con éxito');
                setNuevoLocal({ nombre: '', direccion: '' });
                setMostrarNuevoLocal(false);
                // Recargar lista
                const resConfig = await fetch('/api/configuracion');
                const dataConfig = await resConfig.json();
                if (dataConfig.success) setSucursales(dataConfig.sucursales);
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al crear local');
        } finally {
            setCreandoLocal(false);
        }
    };

    const toggleSucursalActivo = (id: number) => {
        setSucursales(prev => prev.map(s => 
            s.id === id ? { ...s, activo: s.activo === 1 ? 0 : 1 } : s
        ));
    };

    if (loading) return <div className="p-8 text-center text-emerald-600 font-bold">Cargando configuración...</div>;

    return (
        <div className="min-h-screen bg-emerald-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-emerald-800">⚙️ Configuración del Sistema</h1>
                    <Link href="/" className="bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm">
                        🏠 Inicio
                    </Link>
                </div>

                {/* SECCIÓN 1: DATOS DEL NEGOCIO */}
                <section className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-emerald-500">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        🏢 Datos del Negocio
                    </h2>
                    <form onSubmit={handleSaveNegocio} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-600">Nombre del Negocio *</label>
                            <input 
                                type="text"
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-gray-900"
                                value={negocio.nombre ?? ''}
                                onChange={e => setNegocio({...negocio, nombre: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-600">CUIT</label>
                            <input 
                                type="text"
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-gray-900"
                                value={negocio.cuit ?? ''}
                                onChange={e => setNegocio({...negocio, cuit: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-600">Dirección</label>
                            <input 
                                type="text"
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-gray-900"
                                value={negocio.direccion ?? ''}
                                onChange={e => setNegocio({...negocio, direccion: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-600">Teléfono</label>
                            <input 
                                type="text"
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-gray-900"
                                value={negocio.telefono ?? ''}
                                onChange={e => setNegocio({...negocio, telefono: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2 pt-4">
                            <button 
                                type="submit"
                                disabled={guardandoNegocio}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {guardandoNegocio ? 'Guardando...' : '💾 Guardar Datos del Negocio'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* SECCIÓN 2: LOCALES */}
                <section className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-emerald-500">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        📍 Gestión de Locales / Sucursales
                    </h2>
                    
                    <div className="space-y-4">
                        {sucursales.map((sucursal) => (
                            <div key={sucursal.id} className="border-2 border-gray-100 rounded-xl p-4 bg-gray-50 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input 
                                        type="text"
                                        placeholder="Nombre del local"
                                        className="p-2 border border-gray-300 rounded-lg text-gray-900 font-bold"
                                        value={sucursal.nombre ?? ''}
                                        onChange={e => setSucursales(prev => prev.map(s => s.id === sucursal.id ? {...s, nombre: e.target.value} : s))}
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Dirección"
                                        className="p-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                                        value={sucursal.direccion ?? ''}
                                        onChange={e => setSucursales(prev => prev.map(s => s.id === sucursal.id ? {...s, direccion: e.target.value} : s))}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-4 shrink-0">
                                    {/* Toggle Activo */}
                                    <div className="flex flex-col items-center">
                                        <button 
                                            onClick={() => toggleSucursalActivo(sucursal.id)}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${sucursal.activo === 1 ? 'bg-emerald-500' : 'bg-gray-400'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sucursal.activo === 1 ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <span className={`text-[10px] font-bold mt-1 ${sucursal.activo === 1 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {sucursal.activo === 1 ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => handleUpdateSucursal(sucursal.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-lg shadow transition-colors"
                                        title="Guardar cambios de este local"
                                    >
                                        💾
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Agregar Nuevo Local */}
                        {!mostrarNuevoLocal ? (
                            <button 
                                onClick={() => setMostrarNuevoLocal(true)}
                                className="w-full border-2 border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold py-4 rounded-xl transition-colors mt-4"
                            >
                                ➕ Agregar Nuevo Local
                            </button>
                        ) : (
                            <div className="border-2 border-emerald-200 rounded-xl p-4 bg-emerald-50 animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-emerald-800 font-bold mb-3">Nuevo Local</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <input 
                                        type="text"
                                        placeholder="Nombre del Local (ej: Sucursal Norte)"
                                        className="p-2 border border-emerald-300 rounded-lg text-gray-900"
                                        value={nuevoLocal.nombre}
                                        onChange={e => setNuevoLocal({...nuevoLocal, nombre: e.target.value})}
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Dirección"
                                        className="p-2 border border-emerald-300 rounded-lg text-gray-900"
                                        value={nuevoLocal.direccion}
                                        onChange={e => setNuevoLocal({...nuevoLocal, direccion: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleAddSucursal}
                                        disabled={creandoLocal}
                                        className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg shadow hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {creandoLocal ? 'Creando...' : 'Confirmar Nuevo Local'}
                                    </button>
                                    <button 
                                        onClick={() => setMostrarNuevoLocal(false)}
                                        className="flex-1 bg-gray-200 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}
