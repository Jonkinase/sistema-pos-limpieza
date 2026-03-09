# Sistema POS de Limpieza

Sistema web de punto de venta para productos de limpieza, con soporte multisucursal, cuentas corrientes, inventario por local, presupuestos y reportes.

## Estado actual del sistema

Este repositorio está **operativo** y en uso con los siguientes módulos:

- Ventas (contado y fiado) con carrito e historial.
- Cuentas corrientes (clientes, saldo, pagos).
- Presupuestos (guardar, convertir a venta, descargar PDF).
- Inventario por sucursal (stock, precios por local, estado activo/inactivo).
- Gestión de usuarios (admin, encargado, vendedor).
- Dashboard con métricas comerciales.
- Ticket de venta con vista para impresión.
- Reportes de ventas y deudas en CSV compatible con Excel.

Además, ya se aplicaron mejoras responsive clave:

- Vista en **tarjetas para móvil** en historial de ventas.
- Vista en **tarjetas para móvil** en productos de inventario.
- Vista en **tarjetas para móvil** en usuarios.
- Ajustes de tipografía y controles para mejor legibilidad en pantallas chicas.

## Stack técnico

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- PostgreSQL (`pg`)
- Autenticación JWT (cookie httpOnly)
- Exportaciones PDF con `jsPDF`

## Arquitectura general

- Frontend y backend en el mismo proyecto (`app/` + `app/api/`).
- Base de datos inicializada automáticamente desde `lib/db/database.ts`.
- Middleware de autenticación en `middleware.ts`.
- Componentes UI reutilizables en `components/`.

## Módulos de la app

### 1) Principal (`/`)

- Flujo de venta con carrito.
- Cálculo por pesos/litros y tipo de producto.
- Integración con stock por sucursal.
- Historial de ventas (cards en móvil, tabla en desktop).

### 2) Inventario (`/inventario`)

- Alta/edición de productos.
- Precios minorista/mayorista por sucursal.
- Activación/desactivación por local.
- Listado de productos (cards en móvil, tabla en desktop).
- Exportación de tabla de precios a PDF.

### 3) Clientes (`/clientes`)

- Alta de cliente.
- Visualización de saldo.
- Registro de pagos.
- Historial de pagos.

### 4) Presupuestos (`/presupuestos`)

- Consulta de presupuestos.
- Conversión a venta.
- Eliminación de presupuesto.
- Descarga de PDF.

### 5) Usuarios (`/usuarios`)

- Alta y eliminación de usuarios.
- Restricciones por rol (admin/encargado).
- Listado responsive (cards en móvil, tabla en desktop).

### 6) Dashboard (`/dashboard`)

- Ventas del día y del mes.
- Deudas pendientes.
- Presupuestos.
- Top productos y ventas por tipo.

### 7) Ticket (`/ticket/[id]`)

- Vista de ticket para pantalla.
- Estilos específicos para impresión.

## API (resumen)

Principales rutas:

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Ventas: `/api/ventas`, `/api/ventas/[id]`
- Productos: `/api/productos`
- Stock: `/api/stock`
- Clientes: `/api/clientes`
- Pagos: `/api/pagos`
- Presupuestos: `/api/presupuestos`, `/api/presupuestos/[id]`
- Usuarios: `/api/usuarios`
- Estadísticas: `/api/estadisticas`
- Reportes: `/api/reportes/ventas`, `/api/reportes/deudas`
- Utilidades: `/api/calcular-venta`, `/api/init`

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (recomendado)
- npm

## Configuración local

1. Clonar repo:

```bash
git clone <TU_REPO_URL>
cd sistema-pos-limpieza
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear `.env` (basado en `.env.example`):

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/pos_limpieza
AUTH_SECRET=cambia_este_secreto_en_produccion
```

Nota: actualmente el código usa `AUTH_SECRET` en `lib/auth.ts`.

4. Levantar en desarrollo:

```bash
npm run dev
```

5. Abrir:

- `http://localhost:3000`

## Inicialización de base de datos

- El esquema se crea automáticamente al iniciar la app (por `initDatabase()` en `lib/db/database.ts`).
- También existe la ruta `GET /api/init` para forzar inicialización.

## Usuario inicial por defecto

Si la tabla `usuarios` está vacía, se crea automáticamente:

- Email: `admin@sistema.com`
- Password: `admin123`
- Rol: `admin`

## Scripts

```bash
npm run dev    # Desarrollo
npm run build  # Build producción
npm run start  # Run producción
npm run lint   # Lint
```

## Estructura de carpetas

```text
app/
  api/
  clientes/
  dashboard/
  inventario/
  login/
  presupuestos/
  ticket/[id]/
  usuarios/
  page.tsx
components/
  SalesTable.tsx
lib/
  auth.ts
  db/database.ts
middleware.ts
```

## Estado para GitHub

Este README representa el estado actual real del proyecto y está listo para publicación.

Si quieres, el siguiente paso natural es agregar una sección de **capturas de pantalla** por módulo (`/public`) para mejorar la presentación del repositorio.
