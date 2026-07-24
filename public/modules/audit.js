/* ==========================================================================
   MÓDULO: BITÁCORA DE AUDITORÍA GENERAL (EXCLUSIVO ADMINISTRADOR) (RF-10)
   ========================================================================== */

window.App.registerModule("audit", {
  auditLogs: [],

  render: async function(container) {
    let html = `
      <div class="search-filter-bar">
        <div class="search-input-wrapper" style="min-width: 250px;">
          <input type="text" id="audit-search-txt" placeholder="Buscar por usuario, acción o descripción..." style="height: 100%;">
        </div>
        
        <div style="width: 180px;">
          <select id="audit-filter-module">
            <option value="">Módulo (Todos)</option>
            <option value="Autenticación">Autenticación</option>
            <option value="Usuarios">Usuarios</option>
            <option value="Productos">Productos</option>
            <option value="Inventario">Inventario</option>
            <option value="Clientes">Clientes</option>
            <option value="Proveedores">Proveedores</option>
            <option value="Ventas">Ventas</option>
            <option value="Comprobantes">Comprobantes</option>
            <option value="Respaldo">Respaldo</option>
            <option value="Configuración">Configuración</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-audit-clear">Limpiar Filtros</button>
      </div>

      <div class="card">
        <h3 class="card-title">Historial de Operaciones del Sistema</h3>
        <div class="table-responsive" id="audit-table-container">
          <div class="loading-spinner">Cargando bitácora de auditoría...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar auditoría
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('audit-search-txt').addEventListener('input', () => this.filterAudits());
    document.getElementById('audit-filter-module').addEventListener('change', () => this.filterAudits());
    document.getElementById('btn-audit-clear').addEventListener('click', () => {
      document.getElementById('audit-search-txt').value = '';
      document.getElementById('audit-filter-module').value = '';
      this.filterAudits();
    });
  },

  // Cargar registros del backend
  loadAndRenderTable: async function() {
    try {
      this.auditLogs = await App.fetchAPI('/api/audit');
      this.filterAudits();
    } catch (err) {
      console.error("Error al cargar logs de auditoría:", err);
      document.getElementById('audit-table-container').innerHTML = `
        <div class="error-msg">Error al cargar bitácora: ${err.message}</div>
      `;
    }
  },

  // Filtrar en memoria
  filterAudits: function() {
    const searchTxt = document.getElementById('audit-search-txt').value.toLowerCase();
    const moduleVal = document.getElementById('audit-filter-module').value;

    const filtered = this.auditLogs.filter(a => {
      const matchesSearch = 
        (a.usuario_nombre && a.usuario_nombre.toLowerCase().includes(searchTxt)) ||
        (a.usuario_login && a.usuario_login.toLowerCase().includes(searchTxt)) ||
        (a.accion && a.accion.toLowerCase().includes(searchTxt)) ||
        (a.descripcion && a.descripcion.toLowerCase().includes(searchTxt));

      const matchesModule = moduleVal === '' || a.modulo === moduleVal;

      return matchesSearch && matchesModule;
    });

    this.renderTable(filtered);
  },

  // Renderizar la tabla de auditoría
  renderTable: function(list) {
    const container = document.getElementById('audit-table-container');
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se encontraron registros de auditoría.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table" style="font-size: 13px;">
        <thead>
          <tr>
            <th style="width: 160px;">Fecha y Hora</th>
            <th style="width: 180px;">Usuario</th>
            <th style="width: 130px;">Módulo</th>
            <th style="width: 150px;">Acción</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(a => {
      const dateStr = new Date(a.fecha_accion).toLocaleString('es-PE');
      
      tableHtml += `
        <tr>
          <td><code>${dateStr}</code></td>
          <td><strong>${a.usuario_nombre || 'Usuario Desconocido'}</strong> <br><small class="user-role">${a.usuario_login || 'desconocido'}</small></td>
          <td><span class="badge" style="background-color: #cbd5e1; color: var(--text-primary);">${a.modulo}</span></td>
          <td><strong>${a.accion}</strong></td>
          <td>${a.descripcion}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  }
});
