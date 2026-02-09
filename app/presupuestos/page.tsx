'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';

type Presupuesto = {
  id: number;
  sucursal: string;
  sucursal_id: number;
  cliente_nombre: string;
  total: number;
  estado: string;
  fecha: string;
};

type Sucursal = {
  id: number;
  nombre: string;
};

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [user, setUser] = useState<any>(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number>(1);
  const [cargando, setCargando] = useState(true);

  const cargarPresupuestos = (sid?: number) => {
    const targetSid = sid || sucursalSeleccionada;
    setCargando(true);
    fetch(`/api/presupuestos?sucursal_id=${targetSid}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPresupuestos(data.presupuestos);
        }
        setCargando(false);
      });
  };

  useEffect(() => {
    // Verificar rol y cargar datos
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          // Si el admin tiene una sucursal asignada, la usamos por defecto
          if (data.user.sucursal_id) {
            setSucursalSeleccionada(data.user.sucursal_id);
            cargarPresupuestos(data.user.sucursal_id);
          } else {
            cargarPresupuestos(1); // Default for global admin
          }
        }
      });

    // Cargar sucursales
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSucursales(data.sucursales || []);
        }
      });
  }, []);

  // Recargar presupuestos al cambiar sucursal
  useEffect(() => {
    if (user) {
      cargarPresupuestos();
    }
  }, [sucursalSeleccionada]);

  const generarPDF = async (presupuesto_id: number) => {
    try {
      console.log('📄 Generando PDF para presupuesto:', presupuesto_id);

      const res = await fetch(`/api/presupuestos/${presupuesto_id}`);
      const data = await res.json();

      console.log('📦 Datos recibidos:', data);

      if (!data.success) {
        alert('Error: ' + data.error);
        return;
      }

      const { presupuesto, detalles } = data;

      // Crear PDF
      const doc = new jsPDF();

      // Configuración de colores
      const colorPrimario = [41, 128, 185]; // Azul
      const colorTexto = [44, 62, 80];

      // 1. Agregar Banner de Cabecera
      const bannerWidth = 210; // Ancho A4
      const bannerHeight = 45; // Altura optimizada para el banner

      try {
        // En Next.js client side, podemos usar la ruta directa de public
        doc.addImage('/banner-presupuesto.png', 'PNG', 0, 0, bannerWidth, bannerHeight);
      } catch (e) {
        console.error('⚠️ No se pudo cargar el banner en el PDF:', e);
        // Fallback al header anterior si falla la imagen
        doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('PRESUPUESTO', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Sistema de Limpieza', 105, 30, { align: 'center' });
      }

      // Información del presupuesto
      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
      doc.setFontSize(10);

      let y = bannerHeight + 10; // Empezar debajo del banner
      doc.text(`Presupuesto N: ${presupuesto.id}`, 20, y);

      y += 7;
      doc.text(`Fecha: ${new Date(presupuesto.fecha).toLocaleDateString('es-AR')}`, 20, y);

      y += 7;
      doc.text(`Sucursal: ${presupuesto.sucursal}`, 20, y);

      if (presupuesto.sucursal_direccion) {
        y += 7;
        doc.text(`Direccion: ${presupuesto.sucursal_direccion}`, 20, y);
      }

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text(`Cliente: ${presupuesto.cliente_nombre}`, 20, y);

      // Línea separadora
      y += 10;
      doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);

      // Tabla de productos
      y += 10;
      doc.setFontSize(11);

      // Headers de tabla
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 5, 170, 8, 'F');

      doc.text('Producto', 25, y);
      doc.text('Cantidad', 100, y);
      doc.text('Precio/L', 130, y);
      doc.text('Subtotal', 165, y);

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Detalles
      for (const detalle of detalles) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(detalle.producto_nombre, 25, y);
        doc.text(`${detalle.cantidad_litros} L`, 100, y);
        doc.text(`$${detalle.precio_unitario}`, 130, y);
        doc.text(`$${detalle.subtotal.toFixed(2)}`, 165, y);

        // Indicador de precio
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`(${detalle.tipo_precio})`, 100, y + 4);
        doc.setFontSize(10);
        doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);

        y += 10;
      }

      // Total
      y += 5;
      doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.setLineWidth(0.5);
      doc.line(130, y, 190, y);

      y += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', 130, y);
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.text(`$${presupuesto.total.toFixed(2)}`, 165, y);

      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Presupuesto valido por 30 dias', 20, 280);
      doc.text('Gracias por su preferencia', 20, 285);

      // Descargar
      const nombreArchivo = `Presupuesto_${presupuesto.id}_${presupuesto.cliente_nombre.replace(/\s+/g, '_')}.pdf`;
      doc.save(nombreArchivo);

      console.log('✅ PDF generado:', nombreArchivo);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      alert('Error al generar PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const convertirAVenta = async (presupuesto_id: number) => {
    try {
      console.log('🔄 Convirtiendo presupuesto:', presupuesto_id);

      const confirmar = confirm('¿Convertir este presupuesto a venta?\n\n¿Es venta al CONTADO?\n\nOK = Contado\nCancelar = Fiado');

      let cliente_id = null;

      if (!confirmar) {
        const clienteNombre = prompt('Ingresa el nombre del cliente:');
        if (!clienteNombre) return;

        const presupuesto = presupuestos.find(p => p.id === presupuesto_id);
        if (!presupuesto) return;

        const resClientes = await fetch(`/api/clientes?sucursal_id=${presupuesto.sucursal_id}`);
        const dataClientes = await resClientes.json();

        console.log('👥 Clientes disponibles:', dataClientes);

        const cliente = dataClientes.clientes.find((c: any) =>
          c.nombre.toLowerCase().includes(clienteNombre.toLowerCase())
        );

        if (!cliente) {
          alert('Cliente no encontrado. Créalo primero en Cuentas Corrientes.');
          return;
        }

        cliente_id = cliente.id;
        console.log('✅ Cliente seleccionado:', cliente);
      }

      const res = await fetch(`/api/presupuestos/${presupuesto_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_venta: confirmar ? 'contado' : 'fiado',
          cliente_id: cliente_id,
          monto_pagado: confirmar ? undefined : 0
        })
      });

      const data = await res.json();

      console.log('📦 Respuesta de conversión:', data);

      if (data.success) {
        alert(`✅ Presupuesto convertido a Venta #${data.venta_id}`);
        cargarPresupuestos();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error al convertir:', error);
      alert('Error al convertir presupuesto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-orange-600 mb-2">
                📄 Presupuestos
              </h1>
              <p className="text-gray-600">Gestión de presupuestos y cotizaciones</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {user?.rol === 'admin' && (
                <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-200">
                  <span className="text-sm font-medium text-purple-700">📍 Sucursal:</span>
                  <select
                    className="bg-white border-2 border-purple-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-purple-500 text-gray-900"
                    value={sucursalSeleccionada}
                    onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
                  >
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <Link
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
              >
                ← Volver a Ventas
              </Link>
            </div>
          </div>
        </div>

        {/* Lista de Presupuestos */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            📋 Presupuestos Guardados
          </h2>

          {cargando ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : presupuestos.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay presupuestos guardados
            </p>
          ) : (
            <div className="space-y-3">
              {presupuestos.map(presupuesto => (
                <div
                  key={presupuesto.id}
                  className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          #{presupuesto.id}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${presupuesto.estado === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {presupuesto.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Convertido'}
                        </span>
                      </div>

                      <p className="font-bold text-lg text-gray-800">{presupuesto.cliente_nombre}</p>
                      <p className="text-sm text-gray-600">
                        {presupuesto.sucursal} • {new Date(presupuesto.fecha).toLocaleDateString('es-AR')}
                      </p>
                      <p className="text-2xl font-bold text-orange-600 mt-2">
                        ${presupuesto.total.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => generarPDF(presupuesto.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap"
                      >
                        📄 Descargar PDF
                      </button>

                      {presupuesto.estado === 'pendiente' && (
                        <button
                          onClick={() => convertirAVenta(presupuesto.id)}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap"
                        >
                          ✅ Convertir a Venta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}