const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = path.join(__dirname, 'meycif.db');
const db = new sqlite3.Database(DB_FILE);

// Función auxiliar para ejecutar consultas que devuelven múltiples filas
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Función auxiliar para obtener una sola fila
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Función auxiliar para ejecutar comandos (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Inicializar la base de datos de manera serializada
function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Usuarios
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Activo',
        fecha_creacion TEXT NOT NULL
      )`);

      // 2. Productos
      db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_interno TEXT UNIQUE NOT NULL,
        categoria TEXT NOT NULL,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        talla TEXT NOT NULL,
        color TEXT NOT NULL,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        stock_minimo INTEGER NOT NULL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'Activo',
        fecha_creacion TEXT NOT NULL
      )`);

      // 3. Clientes
      db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_documento TEXT NOT NULL,
        numero_documento TEXT UNIQUE NOT NULL,
        nombres_razon_social TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        estado TEXT NOT NULL DEFAULT 'Activo',
        fecha_creacion TEXT NOT NULL
      )`);

      // 4. Proveedores
      db.run(`CREATE TABLE IF NOT EXISTS proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        razon_social TEXT NOT NULL,
        ruc TEXT UNIQUE NOT NULL,
        telefono TEXT,
        direccion TEXT,
        estado TEXT NOT NULL DEFAULT 'Activo'
      )`);

      // 5. Ventas
      db.run(`CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        tipo_comprobante TEXT NOT NULL,
        subtotal REAL NOT NULL,
        descuento REAL NOT NULL DEFAULT 0,
        igv REAL NOT NULL,
        total REAL NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Completada',
        fecha_venta TEXT NOT NULL,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
      )`);

      // 6. Detalle Ventas
      db.run(`CREATE TABLE IF NOT EXISTS detalle_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY(venta_id) REFERENCES ventas(id),
        FOREIGN KEY(producto_id) REFERENCES productos(id)
      )`);

      // 7. Comprobantes
      db.run(`CREATE TABLE IF NOT EXISTS comprobantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        tipo_comprobante TEXT NOT NULL,
        serie TEXT NOT NULL,
        numero INTEGER NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Emitido',
        fecha_emision TEXT NOT NULL,
        fecha_anulacion TEXT,
        motivo_anulacion TEXT,
        FOREIGN KEY(venta_id) REFERENCES ventas(id)
      )`);

      // 8. Movimientos Stock
      db.run(`CREATE TABLE IF NOT EXISTS movimientos_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        tipo_movimiento TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        stock_anterior INTEGER NOT NULL,
        stock_nuevo INTEGER NOT NULL,
        motivo TEXT,
        fecha_movimiento TEXT NOT NULL,
        FOREIGN KEY(producto_id) REFERENCES productos(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
      )`);

      // 9. Auditoría
      db.run(`CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        modulo TEXT NOT NULL,
        accion TEXT NOT NULL,
        descripcion TEXT,
        fecha_accion TEXT NOT NULL,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
      )`);

      // 10. Configuración
      db.run(`CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_empresa TEXT NOT NULL,
        ruc_empresa TEXT NOT NULL,
        direccion_empresa TEXT NOT NULL,
        telefono_empresa TEXT NOT NULL,
        igv REAL NOT NULL DEFAULT 18.0,
        moneda TEXT NOT NULL DEFAULT 'S/.'
      )`);

      // 11. Backups
      db.run(`CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_archivo TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        usuario_id INTEGER NOT NULL,
        fecha_backup TEXT NOT NULL,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
      )`);

      // --- INSERCIÓN DE DATOS SEMILLA ---
      
      // Usuarios Semilla
      db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
        if (!err && row.count === 0) {
          const nowStr = new Date().toISOString();
          db.run(`INSERT INTO usuarios (nombre, usuario, password_hash, rol, estado, fecha_creacion) VALUES
            ('Juan Administrador', 'admin', 'admin123', 'Administrador', 'Activo', ?),
            ('Rosa Vendedora', 'vendedor', 'vendedor123', 'Vendedor', 'Activo', ?),
            ('Pedro Almacenero', 'almacenero', 'almacen123', 'Almacenero', 'Activo', ?)`,
            [nowStr, nowStr, nowStr]
          );
        }
      });

      // Productos Semilla
      db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
        if (!err && row.count === 0) {
          const nowStr = new Date().toISOString();
          db.run(`INSERT INTO productos (codigo_interno, categoria, marca, modelo, talla, color, precio, stock, stock_minimo, estado, fecha_creacion) VALUES
            ('SKU-001', 'Urbano', 'Nike', 'Air Force 1', '38', 'Blanco', 299.90, 15, 3, 'Activo', ?),
            ('SKU-002', 'Deportivo', 'Adidas', 'Ultraboost', '40', 'Negro', 459.90, 2, 5, 'Activo', ?),
            ('SKU-003', 'Formal', 'Calimod', 'Oxford Premium', '41', 'Marrón', 189.90, 12, 4, 'Activo', ?),
            ('SKU-004', 'Urbano', 'Puma', 'Suede Classic', '39', 'Rojo', 229.90, 8, 3, 'Activo', ?)`,
            [nowStr, nowStr, nowStr, nowStr]
          );
        }
      });

      // Clientes Semilla
      db.get("SELECT COUNT(*) as count FROM clientes", (err, row) => {
        if (!err && row.count === 0) {
          const nowStr = new Date().toISOString();
          db.run(`INSERT INTO clientes (tipo_documento, numero_documento, nombres_razon_social, telefono, direccion, estado, fecha_creacion) VALUES
            ('DNI', '12345678', 'Carlos Mendoza Torres', '987654321', 'Av. Larco 456, Miraflores', 'Activo', ?),
            ('RUC', '20102030405', 'Distribuidora CalzaPeru S.A.C.', '014253647', 'Jr. de la Unión 789, Lima', 'Activo', ?)`,
            [nowStr, nowStr]
          );
        }
      });

      // Proveedores Semilla
      db.get("SELECT COUNT(*) as count FROM proveedores", (err, row) => {
        if (!err && row.count === 0) {
          db.run(`INSERT INTO proveedores (razon_social, ruc, telefono, direccion, estado) VALUES
            ('Calzado Mayorista S.A.', '20556677881', '999888777', 'Parque Industrial, Villa El Salvador', 'Activo'),
            ('Cueros y Suelas del Norte', '20443322119', '944555666', 'Av. España 1015, Trujillo', 'Activo')`
          );
        }
      });

      // Configuración Semilla
      db.get("SELECT COUNT(*) as count FROM configuracion", (err, row) => {
        if (!err && row.count === 0) {
          db.run(`INSERT INTO configuracion (nombre_empresa, ruc_empresa, direccion_empresa, telefono_empresa, igv, moneda) VALUES
            ('Calzados Meycif S.A.C.', '20601020304', 'Jr. Junín 1025, Cercado de Lima', '(01) 425-6374', 18.0, 'S/.')`
          );
        }
      });

      // Finalizar indicando éxito
      resolve();
    });
  });
}

// Inicializar base de datos
initDb().then(() => {
  console.log("Base de datos SQLite inicializada y cargada correctamente.");
}).catch((err) => {
  console.error("Error al inicializar la base de datos SQLite:", err);
});

// Métodos expuestos de la base de datos
const Database = {
  // --- USUARIOS ---
  getUsers: () => {
    return query("SELECT * FROM usuarios");
  },
  getUserById: (id) => {
    return get("SELECT * FROM usuarios WHERE id = ?", [id]);
  },
  getUserByUsername: (username) => {
    return get("SELECT * FROM usuarios WHERE LOWER(usuario) = ?", [username.toLowerCase()]);
  },
  saveUser: async (user) => {
    const existing = await get("SELECT id FROM usuarios WHERE LOWER(usuario) = ?", [user.usuario.toLowerCase()]);
    if (existing) {
      throw new Error("El nombre de usuario ya se encuentra registrado.");
    }
    const nowStr = new Date().toISOString();
    const result = await run(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?)",
      [user.nombre, user.usuario, user.password_hash, user.rol, user.estado || "Activo", nowStr]
    );
    return { id: result.id, ...user, fecha_creacion: nowStr };
  },
  updateUser: async (id, userData) => {
    const user = await get("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (!user) throw new Error("Usuario no encontrado.");

    if (userData.usuario && userData.usuario.toLowerCase() !== user.usuario.toLowerCase()) {
      const existing = await get("SELECT id FROM usuarios WHERE LOWER(usuario) = ? AND id != ?", [userData.usuario.toLowerCase(), id]);
      if (existing) {
        throw new Error("El nombre de usuario ya se encuentra registrado.");
      }
    }

    const nombre = userData.nombre !== undefined ? userData.nombre : user.nombre;
    const usuario = userData.usuario !== undefined ? userData.usuario : user.usuario;
    const password_hash = userData.password_hash !== undefined ? userData.password_hash : user.password_hash;
    const rol = userData.rol !== undefined ? userData.rol : user.rol;
    const estado = userData.estado !== undefined ? userData.estado : user.estado;

    await run(
      "UPDATE usuarios SET nombre = ?, usuario = ?, password_hash = ?, rol = ?, estado = ? WHERE id = ?",
      [nombre, usuario, password_hash, rol, estado, id]
    );
    return { id: parseInt(id), nombre, usuario, password_hash, rol, estado };
  },

  // --- PRODUCTOS ---
  getProducts: () => {
    return query("SELECT * FROM productos");
  },
  getProductById: (id) => {
    return get("SELECT * FROM productos WHERE id = ?", [id]);
  },
  saveProduct: async (prod) => {
    const existing = await get("SELECT id FROM productos WHERE codigo_interno = ?", [prod.codigo_interno]);
    if (existing) {
      throw new Error(`El código interno o SKU ${prod.codigo_interno} ya se encuentra registrado.`);
    }

    const nowStr = new Date().toISOString();
    const result = await run(
      "INSERT INTO productos (codigo_interno, categoria, marca, modelo, talla, color, precio, stock, stock_minimo, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [prod.codigo_interno, prod.categoria, prod.marca, prod.modelo, prod.talla, prod.color, parseFloat(prod.precio), parseInt(prod.stock) || 0, parseInt(prod.stock_minimo) || 0, prod.estado || "Activo", nowStr]
    );
    return { id: result.id, ...prod, fecha_creacion: nowStr };
  },
  updateProduct: async (id, prodData) => {
    const prod = await get("SELECT * FROM productos WHERE id = ?", [id]);
    if (!prod) throw new Error("Producto no encontrado.");

    if (prodData.codigo_interno && prodData.codigo_interno !== prod.codigo_interno) {
      const existing = await get("SELECT id FROM productos WHERE codigo_interno = ? AND id != ?", [prodData.codigo_interno, id]);
      if (existing) {
        throw new Error(`El código interno o SKU ${prodData.codigo_interno} ya se encuentra registrado.`);
      }
    }

    const codigo_interno = prodData.codigo_interno !== undefined ? prodData.codigo_interno : prod.codigo_interno;
    const categoria = prodData.categoria !== undefined ? prodData.categoria : prod.categoria;
    const marca = prodData.marca !== undefined ? prodData.marca : prod.marca;
    const modelo = prodData.modelo !== undefined ? prodData.modelo : prod.modelo;
    const talla = prodData.talla !== undefined ? prodData.talla : prod.talla;
    const color = prodData.color !== undefined ? prodData.color : prod.color;
    const precio = prodData.precio !== undefined ? parseFloat(prodData.precio) : prod.precio;
    const stock = prodData.stock !== undefined ? parseInt(prodData.stock) : prod.stock;
    const stock_minimo = prodData.stock_minimo !== undefined ? parseInt(prodData.stock_minimo) : prod.stock_minimo;
    const estado = prodData.estado !== undefined ? prodData.estado : prod.estado;

    await run(
      "UPDATE productos SET codigo_interno = ?, categoria = ?, marca = ?, modelo = ?, talla = ?, color = ?, precio = ?, stock = ?, stock_minimo = ?, estado = ? WHERE id = ?",
      [codigo_interno, categoria, marca, modelo, talla, color, precio, stock, stock_minimo, estado, id]
    );
    return { id: parseInt(id), codigo_interno, categoria, marca, modelo, talla, color, precio, stock, stock_minimo, estado };
  },

  // --- CLIENTES ---
  getClients: () => {
    return query("SELECT * FROM clientes");
  },
  getClientById: (id) => {
    return get("SELECT * FROM clientes WHERE id = ?", [id]);
  },
  getClientByDoc: (numDoc) => {
    return get("SELECT * FROM clientes WHERE numero_documento = ?", [numDoc]);
  },
  saveClient: async (client) => {
    // Validar DNI/RUC
    if (client.tipo_documento === "DNI" && !/^\d{8}$/.test(client.numero_documento)) {
      throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
    }
    if (client.tipo_documento === "RUC" && !/^\d{11}$/.test(client.numero_documento)) {
      throw new Error("El RUC debe contener exactamente 11 dígitos numéricos.");
    }

    const existing = await get("SELECT id FROM clientes WHERE numero_documento = ?", [client.numero_documento]);
    if (existing) {
      throw new Error(`El número de documento ${client.numero_documento} ya está registrado.`);
    }

    const nowStr = new Date().toISOString();
    const result = await run(
      "INSERT INTO clientes (tipo_documento, numero_documento, nombres_razon_social, telefono, direccion, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [client.tipo_documento, client.numero_documento, client.nombres_razon_social, client.telefono || "", client.direccion || "", client.estado || "Activo", nowStr]
    );
    return { id: result.id, ...client, fecha_creacion: nowStr };
  },
  updateClient: async (id, clientData) => {
    const client = await get("SELECT * FROM clientes WHERE id = ?", [id]);
    if (!client) throw new Error("Cliente no encontrado.");

    if (clientData.numero_documento && clientData.numero_documento !== client.numero_documento) {
      if (clientData.tipo_documento === "DNI" && !/^\d{8}$/.test(clientData.numero_documento)) {
        throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
      }
      if (clientData.tipo_documento === "RUC" && !/^\d{11}$/.test(clientData.numero_documento)) {
        throw new Error("El RUC debe contener exactamente 11 dígitos numéricos.");
      }

      const existing = await get("SELECT id FROM clientes WHERE numero_documento = ? AND id != ?", [clientData.numero_documento, id]);
      if (existing) {
        throw new Error(`El número de documento ${clientData.numero_documento} ya está registrado.`);
      }
    }

    const tipo_documento = clientData.tipo_documento !== undefined ? clientData.tipo_documento : client.tipo_documento;
    const numero_documento = clientData.numero_documento !== undefined ? clientData.numero_documento : client.numero_documento;
    const nombres_razon_social = clientData.nombres_razon_social !== undefined ? clientData.nombres_razon_social : client.nombres_razon_social;
    const telefono = clientData.telefono !== undefined ? clientData.telefono : client.telefono;
    const direccion = clientData.direccion !== undefined ? clientData.direccion : client.direccion;
    const estado = clientData.estado !== undefined ? clientData.estado : client.estado;

    await run(
      "UPDATE clientes SET tipo_documento = ?, numero_documento = ?, nombres_razon_social = ?, telefono = ?, direccion = ?, estado = ? WHERE id = ?",
      [tipo_documento, numero_documento, nombres_razon_social, telefono, direccion, estado, id]
    );
    return { id: parseInt(id), tipo_documento, numero_documento, nombres_razon_social, telefono, direccion, estado };
  },

  // --- PROVEEDORES ---
  getSuppliers: () => {
    return query("SELECT * FROM proveedores");
  },
  getSupplierById: (id) => {
    return get("SELECT * FROM proveedores WHERE id = ?", [id]);
  },
  saveSupplier: async (sup) => {
    if (!/^\d{11}$/.test(sup.ruc)) {
      throw new Error("El RUC del proveedor debe contener exactamente 11 dígitos numéricos.");
    }
    const existing = await get("SELECT id FROM proveedores WHERE ruc = ?", [sup.ruc]);
    if (existing) {
      throw new Error(`El proveedor con RUC ${sup.ruc} ya se encuentra registrado.`);
    }

    const result = await run(
      "INSERT INTO proveedores (razon_social, ruc, telefono, direccion, estado) VALUES (?, ?, ?, ?, ?)",
      [sup.razon_social, sup.ruc, sup.telefono || "", sup.direccion || "", sup.estado || "Activo"]
    );
    return { id: result.id, ...sup };
  },
  updateSupplier: async (id, supData) => {
    const sup = await get("SELECT * FROM proveedores WHERE id = ?", [id]);
    if (!sup) throw new Error("Proveedor no encontrado.");

    if (supData.ruc && supData.ruc !== sup.ruc) {
      if (!/^\d{11}$/.test(supData.ruc)) {
        throw new Error("El RUC del proveedor debe contener exactamente 11 dígitos numéricos.");
      }
      const existing = await get("SELECT id FROM proveedores WHERE ruc = ? AND id != ?", [supData.ruc, id]);
      if (existing) {
        throw new Error(`El proveedor con RUC ${supData.ruc} ya se encuentra registrado.`);
      }
    }

    const razon_social = supData.razon_social !== undefined ? supData.razon_social : sup.razon_social;
    const ruc = supData.ruc !== undefined ? supData.ruc : sup.ruc;
    const telefono = supData.telefono !== undefined ? supData.telefono : sup.telefono;
    const direccion = supData.direccion !== undefined ? supData.direccion : sup.direccion;
    const estado = supData.estado !== undefined ? supData.estado : sup.estado;

    await run(
      "UPDATE proveedores SET razon_social = ?, ruc = ?, telefono = ?, direccion = ?, estado = ? WHERE id = ?",
      [razon_social, ruc, telefono, direccion, estado, id]
    );
    return { id: parseInt(id), razon_social, ruc, telefono, direccion, estado };
  },

  // --- VENTAS Y DETALLES (TRANSACCIÓN COMPLETA) ---
  getSales: () => {
    return query("SELECT * FROM ventas");
  },
  getSaleDetails: (ventaId) => {
    return query("SELECT * FROM detalle_ventas WHERE venta_id = ?", [ventaId]);
  },
  saveSale: async (sale) => {
    // Validar integridad referencial
    const client = await get("SELECT * FROM clientes WHERE id = ?", [sale.cliente_id]);
    if (!client) throw new Error("Cliente no válido o no existente.");
    const user = await get("SELECT * FROM usuarios WHERE id = ?", [sale.usuario_id]);
    if (!user) throw new Error("Usuario despachador no válido o no existente.");

    // Validar existencias de stock de todos los ítems antes de guardar nada
    for (const item of sale.detalles) {
      const prod = await get("SELECT * FROM productos WHERE id = ?", [item.producto_id]);
      if (!prod) throw new Error(`El producto con ID ${item.producto_id} no existe.`);
      if (prod.estado !== "Activo") throw new Error(`El producto ${prod.modelo} no está disponible (Inactivo).`);
      if (prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ${prod.modelo} (${prod.color}, Talla ${prod.talla}). Stock actual: ${prod.stock}, Solicitado: ${item.cantidad}.`);
      }
    }

    const nowStr = new Date().toISOString();

    // Ejecutar transaccionalmente utilizando serialize
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Iniciar Transacción
          db.run("BEGIN TRANSACTION");

          // 1. Insertar Cabecera de Venta
          const saleResult = await run(
            "INSERT INTO ventas (cliente_id, usuario_id, tipo_comprobante, subtotal, descuento, igv, total, estado, fecha_venta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [sale.cliente_id, sale.usuario_id, sale.tipo_comprobante, sale.subtotal, sale.descuento || 0, sale.igv, sale.total, 'Completada', nowStr]
          );
          const ventaId = saleResult.id;

          // 2. Insertar Detalles y Descontar Stock
          for (const item of sale.detalles) {
            const prod = await get("SELECT stock FROM productos WHERE id = ?", [item.producto_id]);
            const sub = item.cantidad * item.precio_unitario;
            
            // Insertar detalle
            await run(
              "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
              [ventaId, item.producto_id, item.cantidad, item.precio_unitario, sub]
            );

            // Descontar stock
            const stockNuevo = prod.stock - item.cantidad;
            await run("UPDATE productos SET stock = ? WHERE id = ?", [stockNuevo, item.producto_id]);

            // Registrar movimiento de stock
            await run(
              "INSERT INTO movimientos_stock (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha_movimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [item.producto_id, sale.usuario_id, 'Salida', item.cantidad, prod.stock, stockNuevo, 'Venta', nowStr]
            );
          }

          // 3. Generar Correlativo de Comprobante
          const serie = sale.tipo_comprobante === 'Boleta' ? 'B001' : 'F001';
          const maxNumRow = await get("SELECT MAX(numero) as max_num FROM comprobantes WHERE tipo_comprobante = ?", [sale.tipo_comprobante]);
          const nextNum = (maxNumRow.max_num || 0) + 1;

          await run(
            "INSERT INTO comprobantes (venta_id, tipo_comprobante, serie, numero, estado, fecha_emision) VALUES (?, ?, ?, ?, ?, ?)",
            [ventaId, sale.tipo_comprobante, serie, nextNum, 'Emitido', nowStr]
          );

          // Confirmar Transacción
          db.run("COMMIT");
          
          resolve({ id: ventaId, fecha_venta: nowStr, ...sale });
        } catch (txErr) {
          db.run("ROLLBACK");
          reject(txErr);
        }
      });
    });
  },

  // --- MOVIMIENTOS STOCK ---
  getStockMovements: () => {
    return query("SELECT * FROM movimientos_stock");
  },
  saveStockMovement: async (mov) => {
    const prod = await get("SELECT * FROM productos WHERE id = ?", [mov.producto_id]);
    if (!prod) throw new Error("Producto no válido.");
    const user = await get("SELECT * FROM usuarios WHERE id = ?", [mov.usuario_id]);
    if (!user) throw new Error("Usuario no válido.");

    const cant = parseInt(mov.cantidad);
    let stockNuevo = prod.stock;

    if (mov.tipo_movimiento === "Ingreso") {
      stockNuevo += cant;
    } else if (mov.tipo_movimiento === "Salida") {
      if (prod.stock < cant) {
        throw new Error("No es posible registrar salida. Stock insuficiente en almacén.");
      }
      stockNuevo -= cant;
    } else {
      throw new Error("Tipo de movimiento inválido (debe ser Ingreso o Salida).");
    }

    const nowStr = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          db.run("BEGIN TRANSACTION");

          // Actualizar producto
          await run("UPDATE productos SET stock = ? WHERE id = ?", [stockNuevo, mov.producto_id]);

          // Registrar movimiento
          const result = await run(
            "INSERT INTO movimientos_stock (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha_movimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [mov.producto_id, mov.usuario_id, mov.tipo_movimiento, cant, prod.stock, stockNuevo, mov.motivo || "Ajuste", nowStr]
          );

          db.run("COMMIT");
          resolve({ id: result.id, fecha_movimiento: nowStr, stock_anterior: prod.stock, stock_nuevo: stockNuevo, ...mov });
        } catch (txErr) {
          db.run("ROLLBACK");
          reject(txErr);
        }
      });
    });
  },

  // --- AUDITORÍA ---
  getAudits: () => {
    return query(`
      SELECT a.*, u.nombre as usuario_nombre, u.usuario as usuario_login 
      FROM auditoria a 
      LEFT JOIN usuarios u ON a.usuario_id = u.id 
      ORDER BY a.fecha_accion DESC
    `);
  },
  saveAudit: (userId, modulo, accion, descripcion) => {
    const nowStr = new Date().toISOString();
    return run(
      "INSERT INTO auditoria (usuario_id, modulo, accion, descripcion, fecha_accion) VALUES (?, ?, ?, ?, ?)",
      [userId, modulo, accion, descripcion, nowStr]
    );
  },

  // --- CONFIGURACIÓN ---
  getConfig: () => {
    return get("SELECT * FROM configuracion ORDER BY id ASC LIMIT 1");
  },
  updateConfig: async (configData) => {
    const conf = await get("SELECT * FROM configuracion ORDER BY id ASC LIMIT 1");
    if (!conf) {
      // Insertar por si acaso
      const result = await run(
        "INSERT INTO configuracion (nombre_empresa, ruc_empresa, direccion_empresa, telefono_empresa, igv, moneda) VALUES (?, ?, ?, ?, ?, ?)",
        [configData.nombre_empresa, configData.ruc_empresa, configData.direccion_empresa, configData.telefono_empresa, parseFloat(configData.igv) || 18, configData.moneda || 'S/.']
      );
      return { id: result.id, ...configData };
    }

    const nombre_empresa = configData.nombre_empresa !== undefined ? configData.nombre_empresa : conf.nombre_empresa;
    const ruc_empresa = configData.ruc_empresa !== undefined ? configData.ruc_empresa : conf.ruc_empresa;
    const direccion_empresa = configData.direccion_empresa !== undefined ? configData.direccion_empresa : conf.direccion_empresa;
    const telefono_empresa = configData.telefono_empresa !== undefined ? configData.telefono_empresa : conf.telefono_empresa;
    const igv = configData.igv !== undefined ? parseFloat(configData.igv) : conf.igv;
    const moneda = configData.moneda !== undefined ? configData.moneda : conf.moneda;

    await run(
      "UPDATE configuracion SET nombre_empresa = ?, ruc_empresa = ?, direccion_empresa = ?, telefono_empresa = ?, igv = ?, moneda = ? WHERE id = ?",
      [nombre_empresa, ruc_empresa, direccion_empresa, telefono_empresa, igv, moneda, conf.id]
    );
    return { id: conf.id, nombre_empresa, ruc_empresa, direccion_empresa, telefono_empresa, igv, moneda };
  },

  // --- BACKUPS ---
  getBackups: () => {
    return query(`
      SELECT b.*, u.nombre as usuario_nombre 
      FROM backups b 
      LEFT JOIN usuarios u ON b.usuario_id = u.id 
      ORDER BY b.fecha_backup DESC
    `);
  },
  saveBackupRecord: (nombreArchivo, rutaArchivo, userId) => {
    const nowStr = new Date().toISOString();
    return run(
      "INSERT INTO backups (nombre_archivo, ruta_archivo, usuario_id, fecha_backup) VALUES (?, ?, ?, ?)",
      [nombreArchivo, rutaArchivo, userId, nowStr]
    );
  },
  runBackup: async (userId) => {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);

    // Copiar el archivo de base de datos
    return new Promise((resolve, reject) => {
      fs.copyFile(DB_FILE, backupFilePath, async (err) => {
        if (err) {
          reject(new Error("Error al copiar archivo físico de base de datos: " + err.message));
          return;
        }
        try {
          const nowStr = new Date().toISOString();
          const result = await run(
            "INSERT INTO backups (nombre_archivo, ruta_archivo, usuario_id, fecha_backup) VALUES (?, ?, ?, ?)",
            [backupFileName, backupFilePath, userId, nowStr]
          );
          resolve({ id: result.id, nombre_archivo: backupFileName, ruta_archivo: backupFilePath, usuario_id: userId, fecha_backup: nowStr });
        } catch (dbErr) {
          reject(dbErr);
        }
      });
    });
  },

  // --- COMPROBANTES ---
  getComprobantes: () => {
    return query(`
      SELECT c.*, v.total, v.fecha_venta, cl.nombres_razon_social as cliente_nombre 
      FROM comprobantes c 
      LEFT JOIN ventas v ON c.venta_id = v.id 
      LEFT JOIN clientes cl ON v.cliente_id = cl.id 
      ORDER BY c.fecha_emision DESC
    `);
  },
  getComprobanteBySaleId: (saleId) => {
    return get("SELECT * FROM comprobantes WHERE venta_id = ?", [saleId]);
  },
  annulComprobante: async (comprobanteId, motivo, userId) => {
    const comp = await get("SELECT * FROM comprobantes WHERE id = ?", [comprobanteId]);
    if (!comp) throw new Error("Comprobante no encontrado.");
    if (comp.estado === 'Anulado') throw new Error("El comprobante ya se encuentra anulado.");

    const sale = await get("SELECT * FROM ventas WHERE id = ?", [comp.venta_id]);
    if (!sale) throw new Error("Venta asociada no encontrada.");

    const details = await query("SELECT * FROM detalle_ventas WHERE venta_id = ?", [sale.id]);
    const nowStr = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          db.run("BEGIN TRANSACTION");

          // 1. Actualizar estado del comprobante
          await run(
            "UPDATE comprobantes SET estado = 'Anulado', fecha_anulacion = ?, motivo_anulacion = ? WHERE id = ?",
            [nowStr, motivo, comprobanteId]
          );

          // 2. Actualizar estado de la venta
          await run("UPDATE ventas SET estado = 'Anulado' WHERE id = ?", [sale.id]);

          // 3. Devolver stock de los productos e insertar movimientos de stock
          for (const item of details) {
            const prod = await get("SELECT stock, modelo FROM productos WHERE id = ?", [item.producto_id]);
            if (!prod) throw new Error(`Producto con ID ${item.producto_id} no encontrado en catálogo.`);

            const stockNuevo = prod.stock + item.cantidad;
            
            // Actualizar stock del producto
            await run("UPDATE productos SET stock = ? WHERE id = ?", [stockNuevo, item.producto_id]);

            // Registrar movimiento de stock
            await run(
              "INSERT INTO movimientos_stock (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha_movimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [item.producto_id, userId, 'Ingreso', item.cantidad, prod.stock, stockNuevo, 'Anulación de Venta', nowStr]
            );
          }

          db.run("COMMIT");
          resolve({ id: comprobanteId, estado: 'Anulado', fecha_anulacion: nowStr, motivo_anulacion: motivo });
        } catch (txErr) {
          db.run("ROLLBACK");
          reject(txErr);
        }
      });
    });
  }
};

module.exports = Database;
