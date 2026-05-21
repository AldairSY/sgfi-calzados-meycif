/* ==========================================================================
   MÓDULO: GESTIÓN DE PROVEEDORES (RF-07)
   ========================================================================== */

window.App.registerModule("suppliers", {
  suppliersList: [],

  render: async function(container) {
    let html = `
      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <input type="text" id="sup-search-txt" placeholder="Buscar por RUC o Razón Social..." style="height: 100%;">
        </div>
        <button class="btn btn-primary" id="btn-sup-add" style="margin-left: auto;">🏢 Registrar Proveedor</button>
      </div>

      <div class="card">
        <h3 class="card-title">Proveedores Registrados</h3>
        <div class="table-responsive" id="suppliers-table-container">
          <div class="loading-spinner">Cargando base de datos de proveedores...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar y listar proveedores
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('sup-search-txt').addEventListener('input', () => this.filterSuppliers());
    document.getElementById('btn-sup-add').addEventListener('click', () => this.openAddModal());
  },

  // Cargar proveedores desde la API
  loadAndRenderTable: async function() {
    try {
      this.suppliersList = await App.fetchAPI('/api/suppliers');
      this.filterSuppliers();
    } catch (err) {
      console.error("Error al cargar proveedores:", err);
      document.getElementById('suppliers-table-container').innerHTML = `
        <div class="error-msg">Error al cargar proveedores: ${err.message}</div>
      `;
    }
  },

  // Filtrado de proveedores
  filterSuppliers: function() {
    const txt = document.getElementById('sup-search-txt').value.toLowerCase();
    const filtered = this.suppliersList.filter(s => 
      s.ruc.includes(txt) || 
      s.razon_social.toLowerCase().includes(txt)
    );
    this.renderTable(filtered);
  },

  // Renderizar tabla
  renderTable: function(list) {
    const container = document.getElementById('suppliers-table-container');
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registraron proveedores que coincidan.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Razón Social</th>
            <th>RUC</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th style="text-align: center;">Estado</th>
            <th style="text-align: center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(s => {
      const statusBadge = s.estado === 'Activo'
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-danger">Inactivo</span>`;

      tableHtml += `
        <tr>
          <td><strong>${s.razon_social}</strong></td>
          <td><code>${s.ruc}</code></td>
          <td>${s.telefono || '-'}</td>
          <td>${s.direccion || '-'}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="App.modules.suppliers.openEditModal(${s.id})">Editar</button>
            ${s.estado === 'Activo'
              ? `<button class="btn btn-danger btn-sm" onclick="App.modules.suppliers.toggleStatus(${s.id}, 'Inactivo')">Inactivar</button>`
              : `<button class="btn btn-success btn-sm" onclick="App.modules.suppliers.toggleStatus(${s.id}, 'Activo')">Activar</button>`
            }
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

  // Modal para agregar proveedor (RF-07)
  openAddModal: function() {
    const formHtml = `
      <form id="supplier-form">
        <div class="form-group">
          <label for="sup-name">Razón Social</label>
          <input type="text" id="sup-name" placeholder="Ej. Distribuidora CalzaSuela S.A." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="sup-ruc">RUC (11 dígitos)</label>
            <input type="text" id="sup-ruc" maxlength="11" placeholder="Ej. 20556677881" required>
          </div>
          <div class="form-group">
            <label for="sup-phone">Teléfono de contacto</label>
            <input type="text" id="sup-phone" placeholder="Ej. 999888777">
          </div>
        </div>

        <div class="form-group">
          <label for="sup-address">Dirección Fiscal</label>
          <input type="text" id="sup-address" placeholder="Ej. Parque Industrial Mz. B Lote 5, Lurín">
        </div>

        <div id="supplier-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Proveedor</button>
        </div>
      </form>
    `;

    App.showModal("Registrar Nuevo Proveedor", formHtml, (body) => {
      document.getElementById('supplier-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSupplier();
      });
    });
  },

  // Guardar proveedor
  saveSupplier: async function() {
    const errorEl = document.getElementById('supplier-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const supData = {
      razon_social: document.getElementById('sup-name').value.trim(),
      ruc: document.getElementById('sup-ruc').value.trim(),
      telefono: document.getElementById('sup-phone').value.trim(),
      direccion: document.getElementById('sup-address').value.trim(),
      estado: "Activo"
    };

    // Validar RUC (11 dígitos)
    if (!/^\d{11}$/.test(supData.ruc)) {
      errorEl.textContent = "El RUC del proveedor debe contener exactamente 11 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Modal para editar proveedor
  openEditModal: function(id) {
    const s = this.suppliersList.find(item => item.id === parseInt(id));
    if (!s) return;

    const formHtml = `
      <form id="supplier-edit-form">
        <div class="form-group">
          <label for="sup-name">Razón Social</label>
          <input type="text" id="sup-name" value="${s.razon_social}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="sup-ruc">RUC (11 dígitos)</label>
            <input type="text" id="sup-ruc" value="${s.ruc}" maxlength="11" required>
          </div>
          <div class="form-group">
            <label for="sup-phone">Teléfono</label>
            <input type="text" id="sup-phone" value="${s.telefono || ''}">
          </div>
        </div>

        <div class="form-group">
          <label for="sup-address">Dirección Fiscal</label>
          <input type="text" id="sup-address" value="${s.direccion || ''}">
        </div>

        <div id="supplier-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    `;

    App.showModal("Editar Proveedor", formHtml, (body) => {
      document.getElementById('supplier-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEditSupplier(id);
      });
    });
  },

  // Guardar cambios proveedor
  saveEditSupplier: async function(id) {
    const errorEl = document.getElementById('supplier-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const supData = {
      razon_social: document.getElementById('sup-name').value.trim(),
      ruc: document.getElementById('sup-ruc').value.trim(),
      telefono: document.getElementById('sup-phone').value.trim(),
      direccion: document.getElementById('sup-address').value.trim()
    };

    if (!/^\d{11}$/.test(supData.ruc)) {
      errorEl.textContent = "El RUC del proveedor debe contener exactamente 11 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(supData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Cambiar estado proveedor
  toggleStatus: async function(id, newStatus) {
    try {
      await App.fetchAPI(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: newStatus })
      });
      this.loadAndRenderTable();
    } catch (err) {
      alert("Error al cambiar estado del proveedor: " + err.message);
    }
  }
});
