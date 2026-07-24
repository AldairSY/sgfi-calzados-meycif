const express = require('express');
const path = require('path');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para control de roles
function requireAdmin(req, res, next) {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'Administrador') {
    next();
  } else {
    res.status(403).json({ error: "Acceso denegado. Se requieren privilegios de Administrador." });
  }
}

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: `Acceso denegado. Se requieren privilegios de: ${allowedRoles.join(', ')}.` });
    }
  };
}

// --- ENDPOINTS DE AUTENTICACIÓN ---
app.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ error: "Debe ingresar usuario y contraseña." });
  }

  try {
    const user = await Database.getUserByUsername(usuario);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: "Credenciales incorrectas o usuario no registrado." });
    }
    if (user.estado !== 'Activo') {
      return res.status(401).json({ error: "La cuenta de usuario se encuentra inactiva." });
    }

    // Registrar en auditoría
    await Database.saveAudit(user.id, "Autenticación", "Inicio de Sesión", `El usuario ${user.usuario} inició sesión con éxito.`);

    res.json({
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      estado: user.estado
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ENDPOINTS DE PRODUCTOS (INVENTARIO) ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Database.getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireRoles(['Administrador', 'Almacenero']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const newProduct = await Database.saveProduct(req.body);
    
    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Productos", "Crear Producto", `Registró el producto modelo ${newProduct.modelo} (SKU: ${newProduct.codigo_interno}).`);
    }
    
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireRoles(['Administrador', 'Almacenero']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const updated = await Database.updateProduct(req.params.id, req.body);
    
    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Productos", "Editar Producto", `Actualizó el producto con ID ${req.params.id} (SKU: ${updated.codigo_interno}).`);
    }
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE MOVIMIENTOS DE STOCK ---
app.get('/api/stock/movements', async (req, res) => {
  try {
    const movements = await Database.getStockMovements();
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/movement', requireRoles(['Administrador', 'Almacenero']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const payload = { ...req.body, usuario_id: userId || req.body.usuario_id };
    const newMov = await Database.saveStockMovement(payload);
    const prod = await Database.getProductById(payload.producto_id);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Inventario", "Movimiento Stock", `Registró movimiento de ${newMov.tipo_movimiento} por ${newMov.cantidad} uds del producto ${prod ? prod.modelo : payload.producto_id}. Motivo: ${newMov.motivo}.`);
    }

    res.status(201).json(newMov);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE CLIENTES ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Database.getClients();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', requireRoles(['Administrador', 'Vendedor']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const newClient = await Database.saveClient(req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Clientes", "Registrar Cliente", `Registró al cliente ${newClient.nombres_razon_social} (${newClient.tipo_documento}: ${newClient.numero_documento}).`);
    }

    res.status(201).json(newClient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/customers/:id', requireRoles(['Administrador', 'Vendedor']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const updated = await Database.updateClient(req.params.id, req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Clientes", "Editar Cliente", `Actualizó datos del cliente con ID ${req.params.id} (${updated.nombres_razon_social}).`);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE PROVEEDORES ---
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Database.getSuppliers();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', requireRoles(['Administrador']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const newSupplier = await Database.saveSupplier(req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Proveedores", "Registrar Proveedor", `Registró al proveedor ${newSupplier.razon_social} (RUC: ${newSupplier.ruc}).`);
    }

    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', requireRoles(['Administrador']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const updated = await Database.updateSupplier(req.params.id, req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Proveedores", "Editar Proveedor", `Actualizó datos del proveedor con ID ${req.params.id} (${updated.razon_social}).`);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE VENTAS ---
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await Database.getSales();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id/details', async (req, res) => {
  try {
    const details = await Database.getSaleDetails(req.params.id);
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', requireRoles(['Administrador', 'Vendedor']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const payload = { ...req.body, usuario_id: userId || req.body.usuario_id };
    const newSale = await Database.saveSale(payload);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Ventas", "Registrar Venta", `Emitió ${newSale.tipo_comprobante} por total de S/. ${newSale.total.toFixed(2)} (Venta ID: ${newSale.id}).`);
    }

    res.status(201).json(newSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE COMPROBANTES ---
app.get('/api/comprobantes', async (req, res) => {
  try {
    const receipts = await Database.getComprobantes();
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comprobantes/:id/anular', requireRoles(['Administrador', 'Vendedor']), async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { motivo } = req.body;
  
  if (!motivo || motivo.trim() === '') {
    return res.status(400).json({ error: "Debe ingresar el motivo de la anulación." });
  }

  try {
    const result = await Database.annulComprobante(req.params.id, motivo, userId);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Comprobantes", "Anular Comprobante", `Anuló el comprobante con ID ${req.params.id}. Motivo: ${motivo}.`);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE REPORTES (EXCLUSIVO ADMINISTRADOR) ---
app.get('/api/reports', requireAdmin, async (req, res) => {
  try {
    const allSales = await Database.getSales();
    const allProducts = await Database.getProducts();

    // 1. Reporte de Ingresos Totales por Períodos
    const now = new Date();
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    
    let ingresosDiarios = 0;
    let ingresosSemanales = 0;
    let ingresosMensuales = 0;
    let totalIngresos = 0;

    allSales.forEach(s => {
      if (s.estado === "Completada") {
        const fVenta = new Date(s.fecha_venta);
        const diffTime = Math.abs(now - fVenta);
        const diffDays = Math.ceil(diffTime / millisecondsInDay);

        totalIngresos += s.total;
        
        // Mismo día
        if (fVenta.toDateString() === now.toDateString()) {
          ingresosDiarios += s.total;
        }
        // Últimos 7 días
        if (diffDays <= 7) {
          ingresosSemanales += s.total;
        }
        // Últimos 30 días
        if (diffDays <= 30) {
          ingresosMensuales += s.total;
        }
      }
    });

    // 2. Productos más vendidos (Top Rotación)
    const productQuantities = {};
    for (const sale of allSales) {
      if (sale.estado === "Completada") {
        const details = await Database.getSaleDetails(sale.id);
        details.forEach(d => {
          productQuantities[d.producto_id] = (productQuantities[d.producto_id] || 0) + d.cantidad;
        });
      }
    }

    const topProductos = Object.keys(productQuantities).map(pid => {
      const prod = allProducts.find(p => p.id === parseInt(pid));
      return {
        id: pid,
        modelo: prod ? `${prod.marca} ${prod.modelo} (${prod.color}, Talla ${prod.talla})` : "Producto Desconocido",
        cantidad: productQuantities[pid]
      };
    }).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    // 3. Productos con Stock Bajo / Alerta de Reabastecimiento
    const stockBajo = allProducts.filter(p => p.estado === 'Activo' && p.stock <= p.stock_minimo);

    res.json({
      ingresos: {
        diario: parseFloat(ingresosDiarios.toFixed(2)),
        semanal: parseFloat(ingresosSemanales.toFixed(2)),
        mensual: parseFloat(ingresosMensuales.toFixed(2)),
        total: parseFloat(totalIngresos.toFixed(2))
      },
      topProductos,
      stockBajo
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS (EXCLUSIVO ADMINISTRADOR) ---
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await Database.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const newUser = await Database.saveUser(req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Usuarios", "Registrar Usuario", `Creó al usuario login: ${newUser.usuario} (Rol: ${newUser.rol}).`);
    }

    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const updated = await Database.updateUser(req.params.id, req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Usuarios", "Editar Usuario", `Modificó al usuario login: ${updated.usuario} (Estado: ${updated.estado}).`);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE CONFIGURACIÓN ---
app.get('/api/config', async (req, res) => {
  try {
    const config = await Database.getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', requireAdmin, async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const updated = await Database.updateConfig(req.body);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Configuración", "Editar Configuración", `Actualizó parámetros del sistema (Empresa: ${updated.nombre_empresa}).`);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE BACKUPS ---
app.get('/api/backups', requireAdmin, async (req, res) => {
  try {
    const backups = await Database.getBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backups', requireAdmin, async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    const newBackup = await Database.runBackup(userId);

    // Auditoría
    if (userId) {
      await Database.saveAudit(userId, "Respaldo", "Generar Backup", `Generó copia de seguridad física de la base de datos (Archivo: ${newBackup.nombre_archivo}).`);
    }

    res.status(201).json(newBackup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE AUDITORÍA ---
app.get('/api/audit', requireAdmin, async (req, res) => {
  try {
    const audits = await Database.getAudits();
    res.json(audits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejador por defecto de SPA (Redirige todo lo no coincidente a index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log(`Servidor de Calzados Meycif ejecutándose localmente en: http://localhost:${PORT}`);
});
