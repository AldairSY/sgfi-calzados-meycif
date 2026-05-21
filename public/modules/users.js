/* ==========================================================================
   MÓDULO: GESTIÓN DE USUARIOS DE SISTEMA (EXCLUSIVO ADMINISTRADOR) (RF-01)
   ========================================================================== */

window.App.registerModule("users", {
  usersList: [],

  render: async function(container) {
    let html = `
      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <input type="text" id="user-search-txt" placeholder="Buscar usuario por nombre o login..." style="height: 100%;">
        </div>
        <button class="btn btn-primary" id="btn-user-add" style="margin-left: auto;">⚙️ Registrar Nuevo Usuario</button>
      </div>

      <div class="card">
        <h3 class="card-title">Usuarios del Sistema Registrados</h3>
        <div class="table-responsive" id="users-table-container">
          <div class="loading-spinner">Cargando base de datos de usuarios...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar y listar usuarios
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('user-search-txt').addEventListener('input', () => this.filterUsers());
    document.getElementById('btn-user-add').addEventListener('click', () => this.openAddModal());
  },

  // Cargar usuarios desde la API
  loadAndRenderTable: async function() {
    try {
      this.usersList = await App.fetchAPI('/api/users');
      this.filterUsers();
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      document.getElementById('users-table-container').innerHTML = `
        <div class="error-msg">Error al cargar usuarios: ${err.message}</div>
      `;
    }
  },

  // Filtrado de usuarios
  filterUsers: function() {
    const txt = document.getElementById('user-search-txt').value.toLowerCase();
    const filtered = this.usersList.filter(u => 
      u.nombre.toLowerCase().includes(txt) || 
      u.usuario.toLowerCase().includes(txt)
    );
    this.renderTable(filtered);
  },

  // Renderizar tabla de usuarios
  renderTable: function(list) {
    const container = document.getElementById('users-table-container');
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registraron usuarios coincidentes.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Nombre Usuario (Login)</th>
            <th>Rol / Nivel Acceso</th>
            <th>Fecha Registro</th>
            <th style="text-align: center;">Estado</th>
            <th style="text-align: center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(u => {
      const statusBadge = u.estado === 'Activo'
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-danger">Inactivo</span>`;

      const roleBadge = u.rol === 'Administrador'
        ? `<span class="badge" style="background-color: rgba(197, 168, 128, 0.15); color: var(--primary-color); font-weight: bold;">Administrador</span>`
        : `<span class="badge" style="background-color: #cbd5e1; color: var(--text-primary);">Vendedor</span>`;

      const formattedDate = new Date(u.fecha_creacion).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      tableHtml += `
        <tr>
          <td><strong>${u.nombre}</strong></td>
          <td><code>${u.usuario}</code></td>
          <td>${roleBadge}</td>
          <td>${formattedDate}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="App.modules.users.openEditModal(${u.id})">Editar</button>
            ${u.id === App.currentUser.id 
              ? `<button class="btn btn-secondary btn-sm" disabled style="cursor: not-allowed; opacity: 0.5;">Inactivar</button>`
              : u.estado === 'Activo'
                ? `<button class="btn btn-danger btn-sm" onclick="App.modules.users.toggleStatus(${u.id}, 'Inactivo')">Inactivar</button>`
                : `<button class="btn btn-success btn-sm" onclick="App.modules.users.toggleStatus(${u.id}, 'Activo')">Activar</button>`
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

  // Modal para agregar usuario
  openAddModal: function() {
    const formHtml = `
      <form id="user-form">
        <div class="form-group">
          <label for="usr-fullname">Nombre Completo</label>
          <input type="text" id="usr-fullname" placeholder="Ej. Carlos Torres Mendoza" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="usr-username">Usuario (Login)</label>
            <input type="text" id="usr-username" placeholder="Ej. ctorres" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label for="usr-pass">Contraseña</label>
            <input type="password" id="usr-pass" placeholder="Mínimo 4 caracteres" autocomplete="new-password" required>
          </div>
        </div>

        <div class="form-group">
          <label for="usr-role">Rol / Nivel de Acceso</label>
          <select id="usr-role" required>
            <option value="Vendedor">Vendedor (Acceso limitado a ventas y stock)</option>
            <option value="Administrador">Administrador (Acceso total al sistema)</option>
          </select>
        </div>

        <div id="user-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Usuario</button>
        </div>
      </form>
    `;

    App.showModal("Registrar Nuevo Usuario", formHtml, (body) => {
      document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUser();
      });
    });
  },

  // Guardar usuario
  saveUser: async function() {
    const errorEl = document.getElementById('user-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const userData = {
      nombre: document.getElementById('usr-fullname').value.trim(),
      usuario: document.getElementById('usr-username').value.trim(),
      password_hash: document.getElementById('usr-pass').value.trim(),
      rol: document.getElementById('usr-role').value,
      estado: "Activo"
    };

    if (userData.password_hash.length < 4) {
      errorEl.textContent = "La contraseña debe tener al menos 4 caracteres.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Modal para editar usuario
  openEditModal: function(id) {
    const u = this.usersList.find(item => item.id === parseInt(id));
    if (!u) return;

    const formHtml = `
      <form id="user-edit-form">
        <div class="form-group">
          <label for="usr-fullname">Nombre Completo</label>
          <input type="text" id="usr-fullname" value="${u.nombre}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="usr-username">Usuario (Login)</label>
            <input type="text" id="usr-username" value="${u.usuario}" required>
          </div>
          <div class="form-group">
            <label for="usr-pass">Nueva Contraseña (Opcional)</label>
            <input type="password" id="usr-pass" placeholder="Dejar en blanco para no cambiar">
          </div>
        </div>

        <div class="form-group">
          <label for="usr-role">Rol / Nivel de Acceso</label>
          <select id="usr-role" required ${u.id === App.currentUser.id ? 'disabled' : ''}>
            <option value="Vendedor" ${u.rol === 'Vendedor' ? 'selected' : ''}>Vendedor (Acceso limitado a ventas y stock)</option>
            <option value="Administrador" ${u.rol === 'Administrador' ? 'selected' : ''}>Administrador (Acceso total al sistema)</option>
          </select>
        </div>

        <div id="user-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    `;

    App.showModal("Editar Usuario", formHtml, (body) => {
      document.getElementById('user-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEditUser(id);
      });
    });
  },

  // Guardar edición de usuario
  saveEditUser: async function(id) {
    const errorEl = document.getElementById('user-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const userData = {
      nombre: document.getElementById('usr-fullname').value.trim(),
      usuario: document.getElementById('usr-username').value.trim()
    };

    const pass = document.getElementById('usr-pass').value.trim();
    if (pass) {
      if (pass.length < 4) {
        errorEl.textContent = "La contraseña debe tener al menos 4 caracteres.";
        errorEl.classList.remove('hidden');
        return;
      }
      userData.password_hash = pass;
    }

    const selectRole = document.getElementById('usr-role');
    if (selectRole && !selectRole.disabled) {
      userData.rol = selectRole.value;
    }

    try {
      await App.fetchAPI(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      
      // Si se editó a sí mismo, actualizar los datos de la sesión activa
      if (parseInt(id) === App.currentUser.id) {
        App.currentUser.nombre = userData.nombre;
        App.currentUser.usuario = userData.usuario;
        localStorage.setItem('meycif_session', JSON.stringify(App.currentUser));
        
        // Actualizar UI de cabecera
        document.getElementById('user-display-name').textContent = App.currentUser.nombre;
        document.getElementById('user-avatar-tag').textContent = App.currentUser.nombre.charAt(0).toUpperCase();
      }

      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Cambiar estado de usuario
  toggleStatus: async function(id, newStatus) {
    try {
      await App.fetchAPI(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: newStatus })
      });
      this.loadAndRenderTable();
    } catch (err) {
      alert("Error al cambiar estado del usuario: " + err.message);
    }
  }
});
