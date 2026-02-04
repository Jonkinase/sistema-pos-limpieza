# 🧼 Sistema de Punto de Venta - Productos de Limpieza

Sistema web de gestión de ventas desarrollado con Next.js, React y SQLite para negocios de productos de limpieza a granel.

## 🚀 Características Principales

### ✅ Ventas Inteligentes
- Cálculo automático de litros por monto en pesos
- **Precio mayorista automático** cuando se superan los 5 litros
- Carrito de compras con detalle de precios
- Ventas al contado y a crédito (fiado)

### 💳 Cuentas Corrientes
- Registro de clientes
- Seguimiento de deudas
- Pagos parciales
- Historial completo de pagos

### 📄 Presupuestos
- Guardar cotizaciones
- Generación de PDF profesional
- Conversión de presupuesto a venta

### 🏪 Multisucursal
- Gestión de 2 locales independientes
- Stock por sucursal (próximamente)

### 📊 Dashboard
- Estadísticas de ventas (día/mes)
- Top productos más vendidos
- Análisis contado vs fiado
- Deudas pendientes

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Next.js 16, React, TypeScript
- **Estilos:** Tailwind CSS
- **Base de Datos:** SQLite (better-sqlite3)
- **PDF:** jsPDF

## 📦 Instalación

### Requisitos Previos
- Node.js 18+ 
- npm

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/Jonkinase/sistema-pos-limpieza.git
cd sistema-pos-limpieza
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

4. Abrir en el navegador:
```
http://localhost:3000
```

## 📂 Estructura del Proyecto
```
sistema-limpieza/
├── app/
│   ├── api/              # Rutas API
│   │   ├── clientes/     # Gestión de clientes
│   │   ├── ventas/       # Registro de ventas
│   │   ├── presupuestos/ # Presupuestos
│   │   ├── pagos/        # Pagos de deudas
│   │   └── estadisticas/ # Dashboard
│   ├── clientes/         # Página de cuentas corrientes
│   ├── presupuestos/     # Página de presupuestos
│   ├── dashboard/        # Panel de estadísticas
│   └── page.tsx          # Página principal (ventas)
├── lib/
│   └── db/
│       └── database.ts   # Configuración de SQLite
└── datos-limpieza.db     # Base de datos local
```

## 🎯 Uso del Sistema

### Realizar una Venta
1. Seleccionar sucursal
2. Elegir producto
3. Ingresar monto en pesos
4. El sistema calcula litros y aplica precio mayorista si corresponde
5. Agregar al carrito
6. Finalizar como venta contado o fiado

### Gestionar Cuentas Corrientes
1. Ir a "Cuentas Corrientes"
2. Crear cliente
3. Realizar ventas a crédito
4. Registrar pagos parciales

### Crear Presupuesto
1. Agregar productos al carrito
2. Clic en "Guardar como Presupuesto"
3. Descargar PDF
4. Convertir a venta cuando el cliente confirme

## 📊 Reglas de Negocio

- **Precio Minorista:** Hasta 4.99 litros
- **Precio Mayorista:** 5 litros o más (aplica automáticamente)
- **Cálculo:** El sistema primero calcula con precio minorista, si supera 5L, recalcula con mayorista

## 🔮 Próximas Mejoras

- [ ] Gestión de inventario/stock
- [ ] Reportes exportables (Excel/PDF)
- [ ] Impresión de tickets de venta
- [ ] Backup automático de base de datos
- [ ] Migración a PostgreSQL
- [ ] Sistema de autenticación

## 📝 Licencia

Este proyecto fue desarrollado para uso personal/comercial.

## 👨‍💻 Autor

Desarrollado por Tomas Falco