const Database = require('better-sqlite3');
const db = new Database('datos-limpieza.db');
const users = db.prepare('SELECT nombre, email, rol, sucursal_id FROM usuarios').all();
console.log(JSON.stringify(users, null, 2));
db.close();
