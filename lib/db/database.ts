import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'datos-limpieza.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Crear tablas si no existen
export function initDatabase() {
  // Tabla de Sucursales
  db.exec(`
    CREATE TABLE IF NOT EXISTS sucursales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT,
      activo INTEGER DEFAULT 1
    )
  `);

  // Tabla de Productos
  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio_minorista REAL NOT NULL,
      precio_mayorista REAL NOT NULL,
      litros_minimo_mayorista REAL DEFAULT 5.0,
      tipo TEXT DEFAULT 'liquido',
      activo INTEGER DEFAULT 1
    )
  `);

  // Tabla de Stock por Sucursal
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      sucursal_id INTEGER NOT NULL,
      cantidad_litros REAL DEFAULT 0,
      FOREIGN KEY (producto_id) REFERENCES productos(id),
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
      UNIQUE(producto_id, sucursal_id)
    )
  `);

  // Tabla de Clientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sucursal_id INTEGER,
      nombre TEXT NOT NULL,
      telefono TEXT,
      saldo_deuda REAL DEFAULT 0,
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    )
  `);

  // Tabla de Usuarios (autenticación)
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT DEFAULT 'admin',
      sucursal_id INTEGER,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    )
  `);

  // Migración: Agregar columna sucursal_id a usuarios si no existe
  try {
    db.prepare('SELECT sucursal_id FROM usuarios LIMIT 1').get();
  } catch (error) {
    console.log('🔄 Agregando columna sucursal_id a tabla usuarios...');
    db.exec('ALTER TABLE usuarios ADD COLUMN sucursal_id INTEGER REFERENCES sucursales(id)');
  }

  // Migración: Agregar columna tipo a productos si no existe
  try {
    db.prepare('SELECT tipo FROM productos LIMIT 1').get();
  } catch (error) {
    console.log('🔄 Agregando columna tipo a tabla productos...');
    db.exec("ALTER TABLE productos ADD COLUMN tipo TEXT DEFAULT 'liquido'");
  }

  // Migración: Agregar columna sucursal_id a clientes si no existe
  try {
    db.prepare('SELECT sucursal_id FROM clientes LIMIT 1').get();
  } catch (error) {
    console.log('🔄 Agregando columna sucursal_id a tabla clientes...');
    db.exec('ALTER TABLE clientes ADD COLUMN sucursal_id INTEGER REFERENCES sucursales(id)');

    // Asignar clientes actuales a Local 1 (ID 1)
    db.prepare('UPDATE clientes SET sucursal_id = 1 WHERE sucursal_id IS NULL').run();
  }

  // Insertar sucursales iniciales si no existen
  const sucursalesCount = db.prepare('SELECT COUNT(*) as count FROM sucursales').get() as { count: number };

  if (sucursalesCount.count === 0) {
    db.prepare('INSERT INTO sucursales (nombre, direccion) VALUES (?, ?)').run('Local 1', 'Dirección Local 1');
    db.prepare('INSERT INTO sucursales (nombre, direccion) VALUES (?, ?)').run('Local 2', 'Dirección Local 2');
  }

  // Insertar usuario administrador por defecto si no existe
  const usuariosCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };

  if (usuariosCount.count === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `).run('Administrador', 'admin@sistema.com', passwordHash, 'admin');
  }

  // Insertar productos de ejemplo si no existen
  const productosCount = db.prepare('SELECT COUNT(*) as count FROM productos').get() as { count: number };

  if (productosCount.count === 0) {
    // Cloro
    db.prepare(`
      INSERT INTO productos (nombre, precio_minorista, precio_mayorista, litros_minimo_mayorista)
      VALUES (?, ?, ?, ?)
    `).run('Cloro', 250, 200, 5);

    // Jabón Líquido
    db.prepare(`
      INSERT INTO productos (nombre, precio_minorista, precio_mayorista, litros_minimo_mayorista)
      VALUES (?, ?, ?, ?)
    `).run('Jabón Líquido', 300, 250, 5);

    // Lavandina
    db.prepare(`
      INSERT INTO productos (nombre, precio_minorista, precio_mayorista, litros_minimo_mayorista)
      VALUES (?, ?, ?, ?)
    `).run('Lavandina', 200, 170, 5);
  }

  console.log('✅ Base de datos inicializada correctamente');
}

export default db;