/* ==========================================================================
   MÓDULO: DASHBOARD (PANEL DE CONTROL GENERAL) (RF-01, RF-03)
   ========================================================================== */

window.App.registerModule("dashboard", {
  render: async function(container) {
    const isAdmin = App.currentUser.rol === 'Administrador';
    
    // Generar la estructura base del dashboard
    let html = `
      <div class="dashboard-grid">
        <!-- Tarjeta: Ingresos Totales (Solo visible o con contenido para Admin) -->
        <div class="metric-card" id="dash-card-income">
          <div class="metric-info">
            <h4>Ingresos de Ventas</h4>
            <div class="value" id="dash-income-val">${isAdmin ? 'Calculando...' : 'Restringido'}</div>
          </div>
          <div class="metric-icon gold">💰</div>
        </div>

        <!-- Tarjeta: Total Productos en Catálogo -->
        <div class="metric-card">
          <div class="metric-info">
            <h4>Calzados en Catálogo</h4>
            <div class="value" id="dash-products-val">Cargando...</div>
          </div>
          <div class="metric-icon blue">👞</div>
        </div>

        <!-- Tarjeta: Clientes Registrados -->
        <div class="metric-card">
          <div class="metric-info">
            <h4>Clientes Activos</h4>
            <div class="value" id="dash-customers-val">Cargando...</div>
          </div>
          <div class="metric-icon green">👥</div>
        </div>

        <!-- Tarjeta: Alertas de Stock Bajo -->
        <div class="metric-card">
          <div class="metric-info">
            <h4>Alertas de Stock Bajo</h4>
            <div class="value" id="dash-alerts-val">Cargando...</div>
          </div>
          <div class="metric-icon red">🚨</div>
        </div>
      </div>

      <div class="dashboard-sections">
        <!-- Sección Izquierda: Alertas Críticas de Inventario (RF-03) -->
        <div class="card">
          <h3 class="card-title">Alertas de Reabastecimiento (Calzados con Stock Crítico)</h3>
          <div id="dashboard-alerts-container" class="table-responsive">
            <div class="loading-spinner">Analizando inventario...</div>
          </div>
        </div>

        <!-- Sección Derecha: Accesos Rápidos -->
        <div class="card">
          <h3 class="card-title">Operaciones Rápidas</h3>
          <div class="quick-actions-list" style="display: flex; flex-direction: column; gap: 10px;">
            ${(App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Vendedor') ? `<button class="btn btn-primary" onclick="App.navigateTo('sales')">🛒 Nueva Venta</button>` : ''}
            ${(App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Almacenero') ? `<button class="btn btn-secondary" onclick="App.navigateTo('products')">👞 Registrar Calzado</button>` : ''}
            ${(App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Vendedor') ? `<button class="btn btn-secondary" onclick="App.navigateTo('customers')">👥 Registrar Cliente</button>` : ''}
          </div>
          
          <div class="system-status-info" style="margin-top: 25px; font-size: 13px; color: var(--text-secondary);">
            <p><strong>Estado del Servidor:</strong> En ejecución local</p>
            <p><strong>Base de Datos:</strong> SQLite meycif.db (Estable)</p>
            <p><strong>Límite de SUNAT:</strong> Desconectado (Emisión interna)</p>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar datos asíncronamente
    try {
      const products = await App.fetchAPI('/api/products');
      const customers = await App.fetchAPI('/api/customers');

      // Calcular cantidad de productos y clientes
      document.getElementById('dash-products-val').textContent = products.length;
      document.getElementById('dash-customers-val').textContent = customers.length;

      // Detectar alertas de stock crítico
      const lowStockProducts = products.filter(p => p.estado === 'Activo' && p.stock <= p.stock_minimo);
      const alertVal = document.getElementById('dash-alerts-val');
      alertVal.textContent = lowStockProducts.length;
      
      if (lowStockProducts.length > 0) {
        alertVal.style.color = 'var(--danger-color)';
      } else {
        alertVal.style.color = 'var(--success-color)';
      }

      // Renderizar la tabla de alertas críticas
      const alertsContainer = document.getElementById('dashboard-alerts-container');
      if (lowStockProducts.length === 0) {
        alertsContainer.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--success-color); font-weight: 500;">
            No existen alertas de stock. Todos los niveles se encuentran sobre el mínimo establecido.
          </div>
        `;
      } else {
        let tableHtml = `
          <table class="custom-table">
            <thead>
              <tr>
                <th>Calzado (Modelo / Marca)</th>
                <th>Talla</th>
                <th>Color</th>
                <th style="text-align: center;">Stock Mínimo</th>
                <th style="text-align: center;">Stock Actual</th>
                <th>Estado Alerta</th>
              </tr>
            </thead>
            <tbody>
        `;

        lowStockProducts.forEach(p => {
          tableHtml += `
            <tr>
              <td><strong>${p.marca} ${p.modelo}</strong></td>
              <td>${p.talla}</td>
              <td>${p.color}</td>
              <td style="text-align: center;">${p.stock_minimo}</td>
              <td style="text-align: center; color: var(--danger-color); font-weight: bold;">${p.stock}</td>
              <td>
                <span class="badge badge-danger">${p.stock === 0 ? 'Agotado' : 'Reabastecer'}</span>
              </td>
            </tr>
          `;
        });

        tableHtml += `
            </tbody>
          </table>
        `;
        alertsContainer.innerHTML = tableHtml;
      }

      // Si es Admin, cargar datos financieros de la API de reportes
      if (isAdmin) {
        try {
          const reportData = await App.fetchAPI('/api/reports');
          document.getElementById('dash-income-val').textContent = `S/. ${reportData.ingresos.total.toFixed(2)}`;
        } catch (repErr) {
          console.error("Error al cargar montos del dashboard:", repErr);
          document.getElementById('dash-income-val').textContent = 'S/. 0.00';
        }
      }

    } catch (err) {
      console.error("Error al cargar métricas del dashboard:", err);
    }
  }
});
