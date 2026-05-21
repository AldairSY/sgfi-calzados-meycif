const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Estructura de base de datos inicial (datos de prueba)
const initialDb = {
  usuarios: [
    {
      id: 1,
      nombre: "Juan Administrador",
      usuario: "admin",
      password_hash: "admin123",
      rol: "Administrador",
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    },
    {
      id: 2,
      nombre: "Rosa Vendedora",
      usuario: "vendedor",
      password_hash: "vendedor123",
      rol: "Vendedor",
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    }
  ],
  productos: [
    {
      id: 1,
      categoria: "Urbano",
      marca: "Nike",
      modelo: "Air Force 1",
      talla: "38",
      color: "Blanco",
      precio: 299.90,
      stock: 15,
      stock_minimo: 3,
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    },
    {
      id: 2,
      categoria: "Deportivo",
      marca: "Adidas",
      modelo: "Ultraboost",
      talla: "40",
      color: "Negro",
      precio: 459.90,
      stock: 2, // Stock bajo el stock mínimo (2 <= 5) -> activará alerta roja visual
      stock_minimo: 5,
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    },
    {
      id: 3,
      categoria: "Formal",
      marca: "Calimod",
      modelo: "Oxford Premium",
      talla: "41",
      color: "Marrón",
      precio: 189.90,
      stock: 12,
      stock_minimo: 4,
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    },
    {
      id: 4,
      categoria: "Urbano",
      marca: "Puma",
      modelo: "Suede Classic",
      talla: "39",
      color: "Rojo",
      precio: 229.90,
      stock: 8,
      stock_minimo: 3,
      estado: "Activo",
      fecha_creacion: "2026-05-20T22:00:00Z"
    }
  ],
  clientes: [
    {
      id: 1,
      tipo_documento: "DNI",
      numero_documento: "12345678",
      nombres_razon_social: "Carlos Mendoza Torres",
      telefono: "987654321",
      direccion: "Av. Larco 456, Miraflores",
      estado: "Activo"
    },
    {
      id: 2,
      tipo_documento: "RUC",
      numero_documento: "20102030405",
      nombres_razon_social: "Distribuidora CalzaPeru S.A.C.",
      telefono: "014253647",
      direccion: "Jr. de la Unión 789, Lima",
      estado: "Activo"
    }
  ],
  proveedores: [
    {
      id: 1,
      razon_social: "Calzado Mayorista S.A.",
      ruc: "20556677881",
      telefono: "999888777",
      direccion: "Parque Industrial, Villa El Salvador",
      estado: "Activo"
    },
    {
      id: 2,
      razon_social: "Cueros y Suelas del Norte",
      ruc: "20443322119",
      telefono: "944555666",
      direccion: "Av. España 1015, Trujillo",
      estado: "Activo"
    }
  ],
  ventas: [],
  detalle_ventas: [],
  movimientos_stock: []
};

// Función para inicializar o cargar la base de datos
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error al cargar la base de datos JSON:", err);
    return initialDb;
  }
}

// Función para guardar los datos
function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error al guardar la base de datos JSON:", err);
    return false;
  }
}

const Database = {
  // --- USUARIOS ---
  getUsers: () => {
    const db = loadDb();
    return db.usuarios;
  },
  getUserById: (id) => {
    const db = loadDb();
    return db.usuarios.find(u => u.id === parseInt(id));
  },
  getUserByUsername: (username) => {
    const db = loadDb();
    return db.usuarios.find(u => u.usuario.toLowerCase() === username.toLowerCase());
  },
  saveUser: (user) => {
    const db = loadDb();
    // Validar usuario único
    if (db.usuarios.some(u => u.usuario.toLowerCase() === user.usuario.toLowerCase())) {
      throw new Error("El nombre de usuario ya se encuentra registrado.");
    }
    const nextId = db.usuarios.reduce((max, u) => u.id > max ? u.id : max, 0) + 1;
    const newUser = {
      id: nextId,
      nombre: user.nombre,
      usuario: user.usuario,
      password_hash: user.password_hash,
      rol: user.rol,
      estado: user.estado || "Activo",
      fecha_creacion: new Date().toISOString()
    };
    db.usuarios.push(newUser);
    saveDb(db);
    return newUser;
  },
  updateUser: (id, userData) => {
    const db = loadDb();
    const idx = db.usuarios.findIndex(u => u.id === parseInt(id));
    if (idx === -1) throw new Error("Usuario no encontrado.");
    
    // Validar usuario único si se cambia
    if (userData.usuario && userData.usuario.toLowerCase() !== db.usuarios[idx].usuario.toLowerCase()) {
      if (db.usuarios.some(u => u.usuario.toLowerCase() === userData.usuario.toLowerCase())) {
        throw new Error("El nombre de usuario ya se encuentra registrado.");
      }
    }

    db.usuarios[idx] = {
      ...db.usuarios[idx],
      nombre: userData.nombre !== undefined ? userData.nombre : db.usuarios[idx].nombre,
      usuario: userData.usuario !== undefined ? userData.usuario : db.usuarios[idx].usuario,
      password_hash: userData.password_hash !== undefined ? userData.password_hash : db.usuarios[idx].password_hash,
      rol: userData.rol !== undefined ? userData.rol : db.usuarios[idx].rol,
      estado: userData.estado !== undefined ? userData.estado : db.usuarios[idx].estado
    };
    saveDb(db);
    return db.usuarios[idx];
  },

  // --- PRODUCTOS ---
  getProducts: () => {
    const db = loadDb();
    return db.productos;
  },
  getProductById: (id) => {
    const db = loadDb();
    return db.productos.find(p => p.id === parseInt(id));
  },
  saveProduct: (prod) => {
    const db = loadDb();
    const nextId = db.productos.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    const newProduct = {
      id: nextId,
      categoria: prod.categoria,
      marca: prod.marca,
      modelo: prod.modelo,
      talla: prod.talla,
      color: prod.color,
      precio: parseFloat(prod.precio),
      stock: parseInt(prod.stock) || 0,
      stock_minimo: parseInt(prod.stock_minimo) || 0,
      estado: prod.estado || "Activo",
      fecha_creacion: new Date().toISOString()
    };
    db.productos.push(newProduct);
    saveDb(db);
    return newProduct;
  },
  updateProduct: (id, prodData) => {
    const db = loadDb();
    const idx = db.productos.findIndex(p => p.id === parseInt(id));
    if (idx === -1) throw new Error("Producto no encontrado.");

    db.productos[idx] = {
      ...db.productos[idx],
      categoria: prodData.categoria !== undefined ? prodData.categoria : db.productos[idx].categoria,
      marca: prodData.marca !== undefined ? prodData.marca : db.productos[idx].marca,
      modelo: prodData.modelo !== undefined ? prodData.modelo : db.productos[idx].modelo,
      talla: prodData.talla !== undefined ? prodData.talla : db.productos[idx].talla,
      color: prodData.color !== undefined ? prodData.color : db.productos[idx].color,
      precio: prodData.precio !== undefined ? parseFloat(prodData.precio) : db.productos[idx].precio,
      stock: prodData.stock !== undefined ? parseInt(prodData.stock) : db.productos[idx].stock,
      stock_minimo: prodData.stock_minimo !== undefined ? parseInt(prodData.stock_minimo) : db.productos[idx].stock_minimo,
      estado: prodData.estado !== undefined ? prodData.estado : db.productos[idx].estado
    };
    saveDb(db);
    return db.productos[idx];
  },

  // --- CLIENTES ---
  getClients: () => {
    const db = loadDb();
    return db.clientes;
  },
  getClientById: (id) => {
    const db = loadDb();
    return db.clientes.find(c => c.id === parseInt(id));
  },
  getClientByDoc: (numDoc) => {
    const db = loadDb();
    return db.clientes.find(c => c.numero_documento === numDoc);
  },
  saveClient: (client) => {
    const db = loadDb();
    // Validaciones de formato
    if (client.tipo_documento === "DNI" && !/^\d{8}$/.test(client.numero_documento)) {
      throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
    }
    if (client.tipo_documento === "RUC" && !/^\d{11}$/.test(client.numero_documento)) {
      throw new Error("El RUC debe contener exactamente 11 dígitos numéricos.");
    }
    // Validar unicidad
    if (db.clientes.some(c => c.numero_documento === client.numero_documento)) {
      throw new Error(`El número de documento ${client.numero_documento} ya está registrado.`);
    }

    const nextId = db.clientes.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newClient = {
      id: nextId,
      tipo_documento: client.tipo_documento,
      numero_documento: client.numero_documento,
      nombres_razon_social: client.nombres_razon_social,
      telefono: client.telefono || "",
      direccion: client.direccion || "",
      estado: client.estado || "Activo"
    };
    db.clientes.push(newClient);
    saveDb(db);
    return newClient;
  },
  updateClient: (id, clientData) => {
    const db = loadDb();
    const idx = db.clientes.findIndex(c => c.id === parseInt(id));
    if (idx === -1) throw new Error("Cliente no encontrado.");

    if (clientData.numero_documento && clientData.numero_documento !== db.clientes[idx].numero_documento) {
      if (clientData.tipo_documento === "DNI" && !/^\d{8}$/.test(clientData.numero_documento)) {
        throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
      }
      if (clientData.tipo_documento === "RUC" && !/^\d{11}$/.test(clientData.numero_documento)) {
        throw new Error("El RUC debe contener exactamente 11 dígitos numéricos.");
      }
      if (db.clientes.some(c => c.numero_documento === clientData.numero_documento)) {
        throw new Error(`El número de documento ${clientData.numero_documento} ya está registrado.`);
      }
    }

    db.clientes[idx] = {
      ...db.clientes[idx],
      tipo_documento: clientData.tipo_documento !== undefined ? clientData.tipo_documento : db.clientes[idx].tipo_documento,
      numero_documento: clientData.numero_documento !== undefined ? clientData.numero_documento : db.clientes[idx].numero_documento,
      nombres_razon_social: clientData.nombres_razon_social !== undefined ? clientData.nombres_razon_social : db.clientes[idx].nombres_razon_social,
      telefono: clientData.telefono !== undefined ? clientData.telefono : db.clientes[idx].telefono,
      direccion: clientData.direccion !== undefined ? clientData.direccion : db.clientes[idx].direccion,
      estado: clientData.estado !== undefined ? clientData.estado : db.clientes[idx].estado
    };
    saveDb(db);
    return db.clientes[idx];
  },

  // --- PROVEEDORES ---
  getSuppliers: () => {
    const db = loadDb();
    return db.proveedores;
  },
  getSupplierById: (id) => {
    const db = loadDb();
    return db.proveedores.find(p => p.id === parseInt(id));
  },
  saveSupplier: (sup) => {
    const db = loadDb();
    // Validar RUC (11 dígitos)
    if (!/^\d{11}$/.test(sup.ruc)) {
      throw new Error("El RUC del proveedor debe contener exactamente 11 dígitos numéricos.");
    }
    // Validar unicidad
    if (db.proveedores.some(p => p.ruc === sup.ruc)) {
      throw new Error(`El proveedor con RUC ${sup.ruc} ya se encuentra registrado.`);
    }

    const nextId = db.proveedores.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    const newSupplier = {
      id: nextId,
      razon_social: sup.razon_social,
      ruc: sup.ruc,
      telefono: sup.telefono || "",
      direccion: sup.direccion || "",
      estado: sup.estado || "Activo"
    };
    db.proveedores.push(newSupplier);
    saveDb(db);
    return newSupplier;
  },
  updateSupplier: (id, supData) => {
    const db = loadDb();
    const idx = db.proveedores.findIndex(p => p.id === parseInt(id));
    if (idx === -1) throw new Error("Proveedor no encontrado.");

    if (supData.ruc && supData.ruc !== db.proveedores[idx].ruc) {
      if (!/^\d{11}$/.test(supData.ruc)) {
        throw new Error("El RUC del proveedor debe contener exactamente 11 dígitos numéricos.");
      }
      if (db.proveedores.some(p => p.ruc === supData.ruc)) {
        throw new Error(`El proveedor con RUC ${supData.ruc} ya se encuentra registrado.`);
      }
    }

    db.proveedores[idx] = {
      ...db.proveedores[idx],
      razon_social: supData.razon_social !== undefined ? supData.razon_social : db.proveedores[idx].razon_social,
      ruc: supData.ruc !== undefined ? supData.ruc : db.proveedores[idx].ruc,
      telefono: supData.telefono !== undefined ? supData.telefono : db.proveedores[idx].telefono,
      direccion: supData.direccion !== undefined ? supData.direccion : db.proveedores[idx].direccion,
      estado: supData.estado !== undefined ? supData.estado : db.proveedores[idx].estado
    };
    saveDb(db);
    return db.proveedores[idx];
  },

  // --- VENTAS ---
  getSales: () => {
    const db = loadDb();
    return db.ventas;
  },
  getSaleDetails: (ventaId) => {
    const db = loadDb();
    return db.detalle_ventas.filter(d => d.venta_id === parseInt(ventaId));
  },
  saveSale: (sale) => {
    const db = loadDb();
    
    // Validar integridad referencial
    const client = db.clientes.find(c => c.id === parseInt(sale.cliente_id));
    if (!client) throw new Error("Cliente no válido o no existente.");
    const user = db.usuarios.find(u => u.id === parseInt(sale.usuario_id));
    if (!user) throw new Error("Usuario despachador no válido o no existente.");

    // Validar existencias de stock de todos los ítems antes de guardar nada
    for (const item of sale.detalles) {
      const prod = db.productos.find(p => p.id === parseInt(item.producto_id));
      if (!prod) throw new Error(`El producto con ID ${item.producto_id} no existe.`);
      if (prod.estado !== "Activo") throw new Error(`El producto ${prod.modelo} no está disponible (Inactivo).`);
      if (prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ${prod.modelo} (${prod.color}, Talla ${prod.talla}). Stock actual: ${prod.stock}, Solicitado: ${item.cantidad}.`);
      }
    }

    // Insertar Cabecera de Venta
    const nextVentaId = db.ventas.reduce((max, v) => v.id > max ? v.id : max, 0) + 1;
    const newVenta = {
      id: nextVentaId,
      cliente_id: parseInt(sale.cliente_id),
      usuario_id: parseInt(sale.usuario_id),
      tipo_comprobante: sale.tipo_comprobante, // Boleta | Factura
      subtotal: parseFloat(sale.subtotal),
      descuento: parseFloat(sale.descuento || 0),
      base_imponible: parseFloat(sale.base_imponible),
      igv: parseFloat(sale.igv),
      total: parseFloat(sale.total),
      fecha_venta: new Date().toISOString(),
      estado: "Completada"
    };
    db.ventas.push(newVenta);

    // Insertar Detalles y Descontar Stock
    sale.detalles.forEach(item => {
      const nextDetalleId = db.detalle_ventas.reduce((max, d) => d.id > max ? d.id : max, 0) + 1;
      const sub = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
      const newDetalle = {
        id: nextDetalleId,
        venta_id: nextVentaId,
        producto_id: parseInt(item.producto_id),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        subtotal: sub
      };
      db.detalle_ventas.push(newDetalle);

      // Descontar stock
      const prodIdx = db.productos.findIndex(p => p.id === parseInt(item.producto_id));
      db.productos[prodIdx].stock -= parseInt(item.cantidad);

      // Registrar movimiento de stock
      const nextMovId = db.movimientos_stock.reduce((max, m) => m.id > max ? m.id : max, 0) + 1;
      db.movimientos_stock.push({
        id: nextMovId,
        producto_id: parseInt(item.producto_id),
        tipo_movimiento: "Salida",
        cantidad: parseInt(item.cantidad),
        motivo: "Venta",
        usuario_id: parseInt(sale.usuario_id),
        fecha_movimiento: new Date().toISOString()
      });
    });

    saveDb(db);
    return newVenta;
  },

  // --- MOVIMIENTOS STOCK ---
  getStockMovements: () => {
    const db = loadDb();
    return db.movimientos_stock;
  },
  saveStockMovement: (mov) => {
    const db = loadDb();
    
    const prodIdx = db.productos.findIndex(p => p.id === parseInt(mov.producto_id));
    if (prodIdx === -1) throw new Error("Producto no válido.");
    const user = db.usuarios.find(u => u.id === parseInt(mov.usuario_id));
    if (!user) throw new Error("Usuario autorizador no válido.");

    // Aplicar movimiento al stock
    const cant = parseInt(mov.cantidad);
    if (mov.tipo_movimiento === "Ingreso") {
      db.productos[prodIdx].stock += cant;
    } else if (mov.tipo_movimiento === "Salida") {
      if (db.productos[prodIdx].stock < cant) {
        throw new Error("No es posible registrar salida. Stock insuficiente en almacén.");
      }
      db.productos[prodIdx].stock -= cant;
    } else {
      throw new Error("Tipo de movimiento inválido (debe ser Ingreso o Salida).");
    }

    const nextId = db.movimientos_stock.reduce((max, m) => m.id > max ? m.id : max, 0) + 1;
    const newMovement = {
      id: nextId,
      producto_id: parseInt(mov.producto_id),
      tipo_movimiento: mov.tipo_movimiento,
      cantidad: cant,
      motivo: mov.motivo || "Ajuste",
      usuario_id: parseInt(mov.usuario_id),
      fecha_movimiento: new Date().toISOString()
    };
    db.movimientos_stock.push(newMovement);
    
    saveDb(db);
    return newMovement;
  },
  
  // Exponer base de datos completa sin cache de require
  getRawDb: () => {
    return loadDb();
  }
};

// Asegurar la inicialización física del archivo JSON al cargar la app
loadDb();

module.exports = Database;
