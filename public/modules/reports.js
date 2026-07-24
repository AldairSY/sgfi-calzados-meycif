/* ==========================================================================
   MÓDULO: REPORTES E INGRESOS COMERCIALES (RF-08)
   ========================================================================== */

window.App.registerModule("reports", {
  render: async function(container) {
    this.config = await App.fetchAPI('/api/config').catch(() => null);
    const moneda = this.config ? this.config.moneda : 'S/.';

    let html = `
      <!-- Fila de Tarjetas Financieras -->
      <div class="dashboard-grid">
        <div class="metric-card">
          <div class="metric-info">
            <h4>Ventas del Día</h4>
            <div class="value" id="rep-income-day">${moneda} 0.00</div>
          </div>
          <div class="metric-icon gold">📅</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-info">
            <h4>Ventas de la Semana</h4>
            <div class="value" id="rep-income-week">${moneda} 0.00</div>
          </div>
          <div class="metric-icon blue">📆</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <h4>Ventas del Mes</h4>
            <div class="value" id="rep-income-month">${moneda} 0.00</div>
          </div>
          <div class="metric-icon green">📊</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <h4>Ingresos Acumulados</h4>
            <div class="value" id="rep-income-total" style="color: var(--success-color);">${moneda} 0.00</div>
          </div>
          <div class="metric-icon gold">💰</div>
        </div>
      </div>

      <!-- Panel de Estadísticas Avanzadas -->
      <div class="report-grid" style="margin-bottom: 25px;">
        <!-- Gráfico del Top 5 de Calzados más Vendidos -->
        <div class="card">
          <h3 class="card-title">Top 5: Calzados con Mayor Rotación (Unidades vendidas)</h3>
          <div id="chart-container" class="svg-chart-container">
            <div class="loading-spinner">Generando gráfico de barras...</div>
          </div>
        </div>

        <!-- Tabla: Historial Resumido de Transacciones Comerciales -->
        <div class="card">
          <h3 class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
            Ingresos y Auditoría de Ventas Recientes
            <button class="btn btn-secondary btn-sm" id="btn-export-sales" style="padding: 4px 8px; font-size: 11px;">📥 Exportar Ventas</button>
          </h3>
          <div class="table-responsive" id="reports-sales-container" style="max-height: 250px; overflow-y: auto;">
            <div class="loading-spinner">Consolidando transacciones...</div>
          </div>
        </div>
      </div>

      <!-- Alertas Preventivas de Reposición -->
      <div class="card">
        <h3 class="card-title" style="color: var(--danger-color); display: flex; justify-content: space-between; align-items: center;">
          Reporte de Existencias Críticas y Stock Bajo
          <button class="btn btn-danger btn-sm" id="btn-export-stock" style="padding: 4px 8px; font-size: 11px;">📥 Exportar Stock</button>
        </h3>
        <div class="table-responsive" id="reports-lowstock-container">
          <div class="loading-spinner">Revisando inventarios...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar datos de reportes consolidados
    await this.loadReportData();

    // Enlazar eventos de exportación (HU-13)
    document.getElementById('btn-export-sales').addEventListener('click', () => this.exportSalesToCSV());
    document.getElementById('btn-export-stock').addEventListener('click', () => this.exportStockToCSV());
  },

  // Cargar datos financieros y de productos desde la API
  loadReportData: async function() {
    try {
      const data = await App.fetchAPI('/api/reports');
      const sales = await App.fetchAPI('/api/sales');
      const customers = await App.fetchAPI('/api/customers');
      const moneda = this.config ? this.config.moneda : 'S/.';

      // 1. Población de Importes en Tarjetas
      document.getElementById('rep-income-day').textContent = `${moneda} ${data.ingresos.diario.toFixed(2)}`;
      document.getElementById('rep-income-week').textContent = `${moneda} ${data.ingresos.semanal.toFixed(2)}`;
      document.getElementById('rep-income-month').textContent = `${moneda} ${data.ingresos.mensual.toFixed(2)}`;
      document.getElementById('rep-income-total').textContent = `${moneda} ${data.ingresos.total.toFixed(2)}`;

      // 2. Renderizado del Gráfico del Top 5 Productos
      this.renderTopProductsChart(data.topProductos);

      // 3. Renderizado de Ventas Recientes
      this.renderSalesHistory(sales, customers);

      // 4. Renderizado de Alertas de Stock
      this.renderLowStockList(data.stockBajo);

    } catch (err) {
      console.error("Error al generar reportes:", err);
    }
  },

  // Generar gráfico de barras responsive e interactivo usando SVG/HTML
  renderTopProductsChart: function(topProducts) {
    const container = document.getElementById('chart-container');
    
    if (topProducts.length === 0) {
      container.innerHTML = `<div style="text-align: center; width: 100%; color: var(--text-secondary); line-height: 200px;">No se registran ventas para compilar estadísticas.</div>`;
      return;
    }

    // Encontrar la cantidad máxima para escalar las alturas en porcentaje
    const maxQty = topProducts.reduce((max, item) => item.cantidad > max ? item.cantidad : max, 0);

    let html = '';
    topProducts.forEach(item => {
      // Calcular altura porcentual (máximo 80% para dejar espacio al valor de texto)
      const heightPercent = maxQty > 0 ? (item.cantidad / maxQty) * 80 : 0;
      
      html += `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: ${heightPercent}%;">
            <span class="chart-bar-value">${item.cantidad} uds</span>
          </div>
          <span class="chart-label" title="${item.modelo}">${item.modelo}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // Renderizar la tabla de historial de ingresos y auditoría
  renderSalesHistory: function(sales, customers) {
    const container = document.getElementById('reports-sales-container');
    const moneda = this.config ? this.config.moneda : 'S/.';
    if (sales.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registran transacciones en el historial.</div>`;
      return;
    }

    // Ordenar de más reciente a más antiguo
    sales.sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

    let tableHtml = `
      <table class="custom-table" style="font-size: 12px;">
        <thead>
          <tr>
            <th>ID Venta</th>
            <th>Tipo</th>
            <th>Cliente</th>
            <th style="text-align: right;">Total Recaudado</th>
            <th style="text-align: center;">Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    sales.forEach(s => {
      const client = customers.find(c => c.id === s.cliente_id);
      
      const formattedTotal = `${moneda} ${s.total.toFixed(2)}`;
      const docBadge = s.tipo_comprobante === 'Boleta'
        ? `<span class="badge badge-success">Boleta</span>`
        : `<span class="badge badge-blue" style="background-color: rgba(30,58,138,0.1); color: var(--primary-color);">Factura</span>`;

      tableHtml += `
        <tr>
          <td><code>MEY-${String(s.id).padStart(5, '0')}</code></td>
          <td>${docBadge}</td>
          <td><strong>${client ? client.nombres_razon_social : 'Cliente Varios'}</strong></td>
          <td style="text-align: right; font-weight: bold; color: var(--success-color);">${formattedTotal}</td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm" style="padding: 3px 6px; font-size: 11px;" 
                    onclick="App.modules.billing.showInvoice(${s.id})">Ver PDF</button>
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  },

  // Renderizar tabla de stock bajo
  renderLowStockList: function(lowStock) {
    const container = document.getElementById('reports-lowstock-container');
    
    if (lowStock.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--success-color); font-weight: 500;">
          Excelente: Todos los calzados en inventario se encuentran por encima de su nivel de stock mínimo.
        </div>
      `;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Código SKU</th>
            <th>Categoría</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Talla</th>
            <th>Color</th>
            <th style="text-align: center;">Stock Mínimo</th>
            <th style="text-align: center;">Stock Físico Actual</th>
            <th>Alerta Operacional</th>
          </tr>
        </thead>
        <tbody>
    `;

    lowStock.forEach(p => {
      tableHtml += `
        <tr>
          <td><code>${p.codigo_interno}</code></td>
          <td><strong>${p.categoria}</strong></td>
          <td>${p.marca}</td>
          <td>${p.modelo}</td>
          <td>${p.talla}</td>
          <td>${p.color}</td>
          <td style="text-align: center;">${p.stock_minimo}</td>
          <td style="text-align: center; color: var(--danger-color); font-weight: bold;">${p.stock} uds</td>
          <td>
            <span class="badge badge-danger">${p.stock === 0 ? 'AGOTADO CRÍTICO' : 'REABASTECIMIENTO INMEDIATO'}</span>
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  },

  // Exportar reporte de ventas a CSV (HU-13)
  exportSalesToCSV: async function() {
    try {
      const sales = await App.fetchAPI('/api/sales');
      const customers = await App.fetchAPI('/api/customers');
      
      let csv = 'ID Venta,Tipo Comprobante,Cliente,Subtotal,Descuento,IGV,Total,Fecha Venta,Estado\n';
      
      sales.forEach(s => {
        const client = customers.find(c => c.id === s.cliente_id);
        const clientName = client ? client.nombres_razon_social.replace(/,/g, ' ') : 'Cliente Varios';
        const dateStr = new Date(s.fecha_venta).toLocaleString('es-PE');
        csv += `MEY-${String(s.id).padStart(6, '0')},${s.tipo_comprobante},${clientName},${s.subtotal.toFixed(2)},${s.descuento.toFixed(2)},${s.igv.toFixed(2)},${s.total.toFixed(2)},${dateStr},${s.estado}\n`;
      });
      
      this.downloadCSV(csv, 'reporte_ventas.csv');
    } catch (err) {
      alert("Error al exportar ventas: " + err.message);
    }
  },

  // Exportar reporte de stock bajo a CSV (HU-13)
  exportStockToCSV: async function() {
    try {
      const products = await App.fetchAPI('/api/products');
      const stockBajo = products.filter(p => p.estado === 'Activo' && p.stock <= p.stock_minimo);
      
      let csv = 'Codigo SKU,Categoria,Marca,Modelo,Talla,Color,Precio,Stock Minimo,Stock Actual,Estado Alerta\n';
      
      stockBajo.forEach(p => {
        const alertState = p.stock === 0 ? 'AGOTADO CRITICO' : 'REABASTECIMIENTO INMEDIATO';
        csv += `${p.codigo_interno},${p.categoria},${p.marca.replace(/,/g, ' ')},${p.modelo.replace(/,/g, ' ')},${p.talla},${p.color},${p.precio.toFixed(2)},${p.stock_minimo},${p.stock},${alertState}\n`;
      });
      
      this.downloadCSV(csv, 'reporte_inventario_critico.csv');
    } catch (err) {
      alert("Error al exportar inventario: " + err.message);
    }
  },

  // Descarga el contenido en formato CSV con BOM UTF-8
  downloadCSV: function(csvContent, fileName) {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
