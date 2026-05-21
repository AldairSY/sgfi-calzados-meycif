const express = require('express');
const path = require('path');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Middleware simulado para control de roles en API crítica
function requireAdmin(req, res, next) {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'Administrador') {
    next();
  } else {
    res.status(403).json({ error: "Acceso denegado. Se requieren privilegios de Administrador." });
  }
}

// --- ENDPOINTS DE AUTENTICACIÓN ---
app.post('/api/auth/login', (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ error: "Debe ingresar usuario y contraseña." });
  }

  try {
    const user = Database.getUserByUsername(usuario);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: "Credenciales incorrectas o usuario no registrado." });
    }
    if (user.estado !== 'Activo') {
      return res.status(401).json({ error: "La cuenta de usuario se encuentra inactiva." });
    }

    // Retorna los datos básicos de sesión
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
app.get('/api/products', (req, res) => {
  try {
    const products = Database.getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const newProduct = Database.saveProduct(req.body);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = Database.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE MOVIMIENTOS DE STOCK ---
app.get('/api/stock/movements', (req, res) => {
  try {
    const movements = Database.getStockMovements();
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/movement', (req, res) => {
  try {
    const newMov = Database.saveStockMovement(req.body);
    res.status(201).json(newMov);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE CLIENTES ---
app.get('/api/customers', (req, res) => {
  try {
    const customers = Database.getClients();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const newClient = Database.saveClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const updated = Database.updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE PROVEEDORES ---
app.get('/api/suppliers', (req, res) => {
  try {
    const suppliers = Database.getSuppliers();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const newSupplier = Database.saveSupplier(req.body);
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  try {
    const updated = Database.updateSupplier(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE VENTAS ---
app.get('/api/sales', (req, res) => {
  try {
    const sales = Database.getSales();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id/details', (req, res) => {
  try {
    const details = Database.getSaleDetails(req.params.id);
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const newSale = Database.saveSale(req.body);
    res.status(201).json(newSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ENDPOINTS DE REPORTES (EXCLUSIVO ADMINISTRADOR) ---
app.get('/api/reports', requireAdmin, (req, res) => {
  try {
    const sales = Database.getSales();
    const products = Database.getProducts();
    // Obtener base de datos completa de forma directa y actualizada sin cache
    const rawDb = Database.getRawDb();
    const allSales = rawDb.ventas;
    const allDetails = rawDb.detalle_ventas;
    const allProducts = rawDb.productos;

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
    allDetails.forEach(d => {
      const saleHeader = allSales.find(s => s.id === d.venta_id);
      if (saleHeader && saleHeader.estado === "Completada") {
        productQuantities[d.producto_id] = (productQuantities[d.producto_id] || 0) + d.cantidad;
      }
    });

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
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = Database.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAdmin, (req, res) => {
  try {
    const newUser = Database.saveUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const updated = Database.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
