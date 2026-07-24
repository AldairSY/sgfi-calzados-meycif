/* ==========================================================================
   MÓDULO: ETIQUETAS E IMPRESIÓN (RF-11)
   ========================================================================== */

window.App.registerModule("etiquetas", {
  productsList: [],

  render: async function(container) {
    this.config = await App.fetchAPI('/api/config').catch(() => null);
    
    let html = `
      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <input type="text" id="label-search-txt" placeholder="Buscar calzado por SKU, modelo, marca..." style="height: 100%;">
        </div>
        <button class="btn btn-secondary" id="btn-label-clear">Limpiar Búsqueda</button>
      </div>

      <div class="card">
        <h3 class="card-title">Seleccione Calzado para Imprimir Etiqueta</h3>
        <div class="table-responsive" id="label-products-table-container">
          <div class="loading-spinner">Cargando catálogo...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar productos
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('label-search-txt').addEventListener('input', () => this.filterProducts());
    document.getElementById('btn-label-clear').addEventListener('click', () => {
      document.getElementById('label-search-txt').value = '';
      this.filterProducts();
    });
  },

  // Cargar productos desde API
  loadAndRenderTable: async function() {
    try {
      this.productsList = await App.fetchAPI('/api/products');
      this.filterProducts();
    } catch (err) {
      console.error("Error al cargar productos para etiquetas:", err);
      document.getElementById('label-products-table-container').innerHTML = `
        <div class="error-msg">Error al cargar productos: ${err.message}</div>
      `;
    }
  },

  // Filtrar
  filterProducts: function() {
    const txt = document.getElementById('label-search-txt').value.toLowerCase();
    const filtered = this.productsList.filter(p => 
      p.codigo_interno.toLowerCase().includes(txt) ||
      p.marca.toLowerCase().includes(txt) ||
      p.modelo.toLowerCase().includes(txt)
    );
    this.renderTable(filtered);
  },

  // Renderizar tabla
  renderTable: function(list) {
    const container = document.getElementById('label-products-table-container');
    const moneda = this.config ? this.config.moneda : 'S/.';

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se encontraron calzados coincidentes.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>SKU Código</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Talla</th>
            <th>Color</th>
            <th style="text-align: right;">Precio</th>
            <th style="text-align: center;">Stock</th>
            <th style="text-align: center;">Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(p => {
      tableHtml += `
        <tr>
          <td><code>${p.codigo_interno}</code></td>
          <td><strong>${p.marca}</strong></td>
          <td>${p.modelo}</td>
          <td>${p.talla}</td>
          <td>${p.color}</td>
          <td style="text-align: right; font-weight: bold;">${moneda} ${p.precio.toFixed(2)}</td>
          <td style="text-align: center;">${p.stock} uds</td>
          <td style="text-align: center;">
            <button class="btn btn-primary btn-sm" onclick="App.modules.etiquetas.generateLabel(${p.id})">🏷️ Generar Etiqueta</button>
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

  // Generar y mostrar etiqueta imprimible en modal (HU-17)
  generateLabel: function(productId) {
    const p = this.productsList.find(item => item.id === parseInt(productId));
    if (!p) return;

    const nombreEmpresa = this.config ? this.config.nombre_empresa : 'CALZADOS MEYCIF S.A.C.';
    const moneda = this.config ? this.config.moneda : 'S/.';

    // Generar layout de la etiqueta
    const labelHtml = `
      <div class="label-card-print" id="printable-label">
        <div class="label-title">${nombreEmpresa}</div>
        <div style="font-size: 13px; text-transform: uppercase;">
          <strong>Calzado Comercial</strong>
        </div>
        
        <!-- Código Interno en formato código de barras sutil -->
        <div class="label-barcode">*${p.codigo_interno}*</div>
        <div style="font-size: 11px; margin-bottom: 8px;">Código Interno: <strong>${p.codigo_interno}</strong></div>
        
        <div class="label-info">
          <p><strong>Marca:</strong> ${p.marca}</p>
          <p><strong>Modelo:</strong> ${p.modelo}</p>
          <p><strong>Talla:</strong> ${p.talla} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Color:</strong> ${p.color}</p>
          <p><strong>Categoría:</strong> ${p.categoria}</p>
        </div>
        
        <div class="label-price">
          Precio: ${moneda} ${p.precio.toFixed(2)}
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;" class="no-print">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir Etiqueta</button>
      </div>
    `;

    App.showModal(`Etiqueta de Producto - ${p.codigo_interno}`, labelHtml);
  }
});
