/* ==========================================================================
   MÓDULO: GESTIÓN DE CLIENTES (RF-07)
   ========================================================================== */

window.App.registerModule("customers", {
  customersList: [],

  render: async function(container) {
    let html = `
      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <input type="text" id="cust-search-txt" placeholder="Buscar por número de documento o nombre..." style="height: 100%;">
        </div>
        <button class="btn btn-primary" id="btn-cust-add" style="margin-left: auto;">👥 Registrar Cliente</button>
      </div>

      <div class="card">
        <h3 class="card-title">Clientes Registrados</h3>
        <div class="table-responsive" id="customers-table-container">
          <div class="loading-spinner">Cargando base de datos de clientes...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar y listar clientes
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('cust-search-txt').addEventListener('input', () => this.filterCustomers());
    document.getElementById('btn-cust-add').addEventListener('click', () => this.openAddModal());
  },

  // Cargar clientes desde API
  loadAndRenderTable: async function() {
    try {
      this.customersList = await App.fetchAPI('/api/customers');
      this.filterCustomers();
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      document.getElementById('customers-table-container').innerHTML = `
        <div class="error-msg">Error al cargar clientes: ${err.message}</div>
      `;
    }
  },

  // Filtrado de clientes
  filterCustomers: function() {
    const txt = document.getElementById('cust-search-txt').value.toLowerCase();
    const filtered = this.customersList.filter(c => 
      c.numero_documento.includes(txt) || 
      c.nombres_razon_social.toLowerCase().includes(txt)
    );
    this.renderTable(filtered);
  },

  // Renderizar tabla de clientes
  renderTable: function(list) {
    const container = document.getElementById('customers-table-container');
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registraron clientes que coincidan.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Tipo Doc.</th>
            <th>Nº Documento</th>
            <th>Nombres o Razón Social</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th style="text-align: center;">Estado</th>
            <th style="text-align: center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(c => {
      const statusBadge = c.estado === 'Activo'
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-danger">Inactivo</span>`;

      tableHtml += `
        <tr>
          <td><strong>${c.tipo_documento}</strong></td>
          <td><code>${c.numero_documento}</code></td>
          <td><strong>${c.nombres_razon_social}</strong></td>
          <td>${c.telefono || '-'}</td>
          <td>${c.direccion || '-'}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="App.modules.customers.openEditModal(${c.id})">Editar</button>
            ${c.estado === 'Activo'
              ? `<button class="btn btn-danger btn-sm" onclick="App.modules.customers.toggleStatus(${c.id}, 'Inactivo')">Inactivar</button>`
              : `<button class="btn btn-success btn-sm" onclick="App.modules.customers.toggleStatus(${c.id}, 'Activo')">Activar</button>`
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

  // Modal para agregar cliente (RF-07)
  openAddModal: function() {
    const formHtml = `
      <form id="customer-form">
        <div class="form-row">
          <div class="form-group">
            <label for="cust-type-doc">Tipo de Documento</label>
            <select id="cust-type-doc" required>
              <option value="DNI">DNI (Persona Natural)</option>
              <option value="RUC">RUC (Persona Jurídica)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cust-num-doc">Número de Documento</label>
            <input type="text" id="cust-num-doc" maxlength="11" placeholder="Ej. 12345678 o 20102030405" required>
          </div>
        </div>

        <div class="form-group">
          <label for="cust-name">Nombres o Razón Social</label>
          <input type="text" id="cust-name" placeholder="Ej. Juan Pérez o Inversiones M&C S.A.C." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cust-phone">Teléfono</label>
            <input type="text" id="cust-phone" placeholder="Ej. 987654321">
          </div>
          <div class="form-group">
            <label for="cust-address">Dirección</label>
            <input type="text" id="cust-address" placeholder="Ej. Av. Larco 123, Miraflores">
          </div>
        </div>

        <div id="customer-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Cliente</button>
        </div>
      </form>
    `;

    App.showModal("Registrar Nuevo Cliente", formHtml, (body) => {
      document.getElementById('customer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCustomer();
      });
    });
  },

  // Guardar cliente
  saveCustomer: async function() {
    const errorEl = document.getElementById('customer-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const clientData = {
      tipo_documento: document.getElementById('cust-type-doc').value,
      numero_documento: document.getElementById('cust-num-doc').value.trim(),
      nombres_razon_social: document.getElementById('cust-name').value.trim(),
      telefono: document.getElementById('cust-phone').value.trim(),
      direccion: document.getElementById('cust-address').value.trim(),
      estado: "Activo"
    };

    // Validaciones estrictas del DNI/RUC
    if (clientData.tipo_documento === 'DNI' && !/^\d{8}$/.test(clientData.numero_documento)) {
      errorEl.textContent = "El DNI debe contener exactamente 8 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (clientData.tipo_documento === 'RUC' && !/^\d{11}$/.test(clientData.numero_documento)) {
      errorEl.textContent = "El RUC debe contener exactamente 11 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/customers', {
        method: 'POST',
        body: JSON.stringify(clientData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Modal para editar cliente
  openEditModal: function(id) {
    const c = this.customersList.find(item => item.id === parseInt(id));
    if (!c) return;

    const formHtml = `
      <form id="customer-edit-form">
        <div class="form-row">
          <div class="form-group">
            <label for="cust-type-doc">Tipo de Documento</label>
            <select id="cust-type-doc" required>
              <option value="DNI" ${c.tipo_documento === 'DNI' ? 'selected' : ''}>DNI (Persona Natural)</option>
              <option value="RUC" ${c.tipo_documento === 'RUC' ? 'selected' : ''}>RUC (Persona Jurídica)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cust-num-doc">Número de Documento</label>
            <input type="text" id="cust-num-doc" value="${c.numero_documento}" maxlength="11" required>
          </div>
        </div>

        <div class="form-group">
          <label for="cust-name">Nombres o Razón Social</label>
          <input type="text" id="cust-name" value="${c.nombres_razon_social}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cust-phone">Teléfono</label>
            <input type="text" id="cust-phone" value="${c.telefono || ''}">
          </div>
          <div class="form-group">
            <label for="cust-address">Dirección</label>
            <input type="text" id="cust-address" value="${c.direccion || ''}">
          </div>
        </div>

        <div id="customer-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    `;

    App.showModal("Editar Cliente", formHtml, (body) => {
      document.getElementById('customer-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEditCustomer(id);
      });
    });
  },

  // Guardar edición de cliente
  saveEditCustomer: async function(id) {
    const errorEl = document.getElementById('customer-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const clientData = {
      tipo_documento: document.getElementById('cust-type-doc').value,
      numero_documento: document.getElementById('cust-num-doc').value.trim(),
      nombres_razon_social: document.getElementById('cust-name').value.trim(),
      telefono: document.getElementById('cust-phone').value.trim(),
      direccion: document.getElementById('cust-address').value.trim()
    };

    if (clientData.tipo_documento === 'DNI' && !/^\d{8}$/.test(clientData.numero_documento)) {
      errorEl.textContent = "El DNI debe contener exactamente 8 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (clientData.tipo_documento === 'RUC' && !/^\d{11}$/.test(clientData.numero_documento)) {
      errorEl.textContent = "El RUC debe contener exactamente 11 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(clientData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Activar o Inactivar cliente (Baja lógica)
  toggleStatus: async function(id, newStatus) {
    try {
      await App.fetchAPI(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: newStatus })
      });
      this.loadAndRenderTable();
    } catch (err) {
      alert("Error al cambiar estado del cliente: " + err.message);
    }
  }
});
