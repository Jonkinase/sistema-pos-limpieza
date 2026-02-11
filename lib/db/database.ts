import { Pool, types } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Configurar para que los tipos NUMERIC/DECIMAL se devuelvan como números, no strings
types.setTypeParser(1700, (val) => parseFloat(val));

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper para ejecutar queries de forma asíncrona
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Función para inicializar la base de datos en PostgreSQL
export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tabla de Sucursales
    await client.query(`
      CREATE TABLE IF NOT EXISTS sucursales (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        direccion TEXT,
        activo INTEGER DEFAULT 1
      )
    `);

    // Tabla de Productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio_minorista DECIMAL(12, 2) NOT NULL,
        precio_mayorista DECIMAL(12, 2) NOT NULL,
        litros_minimo_mayorista DECIMAL(12, 2) DEFAULT 5.0,
        tipo TEXT DEFAULT 'liquido',
        activo INTEGER DEFAULT 1
      )
    `);

    // Tabla de Stock por Sucursal
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        cantidad_litros DECIMAL(12, 2) DEFAULT 0,
        precio_minorista DECIMAL(12, 2),
        precio_mayorista DECIMAL(12, 2),
        activo INTEGER DEFAULT 1,
        UNIQUE(producto_id, sucursal_id)
      )
    `);

    // Tabla de Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        sucursal_id INTEGER REFERENCES sucursales(id),
        nombre TEXT NOT NULL,
        telefono TEXT,
        saldo_deuda DECIMAL(12, 2) DEFAULT 0,
        activo INTEGER DEFAULT 1
      )
    `);

    // Tabla de Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT DEFAULT 'admin',
        sucursal_id INTEGER REFERENCES sucursales(id),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        cliente_id INTEGER REFERENCES clientes(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        total DECIMAL(12, 2) NOT NULL,
        pagado DECIMAL(12, 2) NOT NULL,
        tipo_venta TEXT DEFAULT 'contado',
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migración para añadir usuario_id si no existe
    try {
      await client.query('ALTER TABLE ventas ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id)');
    } catch (e) {
      // Ignorar si falla (ej. ya existe y la sintaxis IF NOT EXISTS no es soportada en versiones viejas, 
      // aunque en PG 9.6+ funciona para columnas)
    }

    // Tabla de Detalle de Ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        cantidad_litros DECIMAL(12, 2) NOT NULL,
        precio_unitario DECIMAL(12, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL
      )
    `);

    // Tabla de Pagos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id),
        monto DECIMAL(12, 2) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT
      )
    `);

    // Tabla de Presupuestos
    await client.query(`
      CREATE TABLE IF NOT EXISTS presupuestos (
        id SERIAL PRIMARY KEY,
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        cliente_nombre TEXT,
        total DECIMAL(12, 2) NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL
      )
    `);

    // Tabla de Detalle de Presupuestos
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_presupuestos (
        id SERIAL PRIMARY KEY,
        presupuesto_id INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        producto_nombre TEXT NOT NULL,
        cantidad_litros DECIMAL(12, 2) NOT NULL,
        precio_unitario DECIMAL(12, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL,
        tipo_precio TEXT
      )
    `);

    // Las migraciones de columnas se pueden manejar con ALTER TABLE si es necesario, 
    // pero para PostgreSQL es mejor tener el esquema base sólido.

    // Migración para presupuestos: asegurar ON DELETE SET NULL en venta_id
    try {
      await client.query('ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_venta_id_fkey');
      await client.query('ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL');
    } catch (e) {
      console.log('⚠️ Nota: No se pudo actualizar la constraint de presupuestos (puede que ya esté bien o la tabla no exista aún)');
    }

    // MIGRACIÓN: Descentralización de Inventario (Precios y Activo por Local)
    try {
      // 1. Añadir columnas a la tabla stock si no existen
      await client.query('ALTER TABLE stock ADD COLUMN IF NOT EXISTS precio_minorista DECIMAL(12, 2)');
      await client.query('ALTER TABLE stock ADD COLUMN IF NOT EXISTS precio_mayorista DECIMAL(12, 2)');
      await client.query('ALTER TABLE stock ADD COLUMN IF NOT EXISTS activo INTEGER DEFAULT 1');

      // 2. Poblar columnas con valores actuales de la tabla productos para registros que no tengan precio
      await client.query(`
        UPDATE stock s
        SET 
          precio_minorista = p.precio_minorista,
          precio_mayorista = p.precio_mayorista,
          activo = p.activo
        FROM productos p
        WHERE s.producto_id = p.id
        AND s.precio_minorista IS NULL
      `);
      console.log('✅ Migración de inventario descentralizado completada');
    } catch (e) {
      console.error('❌ Error en migración de inventario descentralizado:', e);
    }

    // Insertar sucursales iniciales
    const sucursalesCount = await client.query('SELECT COUNT(*) FROM sucursales');
    if (parseInt(sucursalesCount.rows[0].count) === 0) {
      await client.query('INSERT INTO sucursales (nombre, direccion) VALUES ($1, $2)', ['Local 1', 'Dirección Local 1']);
      await client.query('INSERT INTO sucursales (nombre, direccion) VALUES ($1, $2)', ['Local 2', 'Dirección Local 2']);
    }

    // Insertar usuario administrador
    const usuariosCount = await client.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(usuariosCount.rows[0].count) === 0) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      await client.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES ($1, $2, $3, $4)
      `, ['Administrador', 'admin@sistema.com', passwordHash, 'admin']);
    }

    // Migración para Item Rápido y Seguridad Histórica
    try {
      // 1. Añadir columna producto_nombre si no existe
      await client.query('ALTER TABLE detalle_ventas ADD COLUMN IF NOT EXISTS producto_nombre TEXT');

      // 2. Migrar nombres actuales de productos a los detalles de venta (Congelar historial)
      await client.query(`
        UPDATE detalle_ventas dv
        SET producto_nombre = p.nombre
        FROM productos p
        WHERE dv.producto_id = p.id AND dv.producto_nombre IS NULL
      `);

      // 3. Hacer que producto_id sea opcional (nullable) para permitir items rápidos
      await client.query('ALTER TABLE detalle_ventas ALTER COLUMN producto_id DROP NOT NULL');

      console.log('✅ Migración de Item Rápido y Seguridad Histórica completada');
    } catch (e) {
      console.error('❌ Error en migración de Item Rápido:', e);
    }

    await client.query('COMMIT');
    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Inicializar base de datos
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

export default pool;