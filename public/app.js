/* ==========================================================================
   APP PRINCIPAL (SPA CLIENT-SIDE ROUTER & APP CONTROLLER)
   ========================================================================== */

// Estado global de la aplicación en el cliente (window.App)
window.App = {
  currentUser: null,
  activeModule: 'dashboard',
  modules: {},

  // Registro dinámico de módulos funcionales
  registerModule: function(name, module) {
    this.modules[name] = module;
  },

  // Inicialización de la aplicación SPA
  init: function() {
    this.bindEvents();
    this.checkSession();
  },

  // Vinculación de eventos globales del DOM
  bindEvents: function() {
    // Evento de Login (Corregido para invocar window.App.modules.auth.login)
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userInp = document.getElementById('username').value.trim();
      const passInp = document.getElementById('password').value.trim();
      const errorEl = document.getElementById('login-error');
      
      errorEl.classList.add('hidden');
      errorEl.textContent = '';

      if (!userInp || !passInp) {
        errorEl.textContent = 'Debe ingresar su usuario y contraseña.';
        errorEl.classList.remove('hidden');
        return;
      }

      try {
        const user = await window.App.modules.auth.login(userInp, passInp);
        window.App.loginSuccess(user);
      } catch (err) {
        errorEl.textContent = err.message || 'Error de conexión con el servidor.';
        errorEl.classList.remove('hidden');
      }
    });

    // Eventos de Navegación Lateral (Sidebar)
    const menuLinks = {
      'nav-dashboard': 'dashboard',
      'nav-products': 'products',
      'nav-stock': 'stock',
      'nav-customers': 'customers',
      'nav-suppliers': 'suppliers',
      'nav-sales': 'sales',
      'nav-reports': 'reports',
      'nav-users': 'users'
    };

    Object.keys(menuLinks).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.renderView(menuLinks[id]);
        });
      }
    });

    // Cerrar Sesión
    document.getElementById('btn-logout').addEventListener('click', (e) => {
      e.preventDefault();
      this.modules.auth.logout();
    });

    // Cerrar Modales
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('global-modal');
      if (e.target === modal) this.closeModal();
    });
  },

  // Comprobar si existe sesión previa persistida
  checkSession: function() {
    const session = localStorage.getItem('meycif_session');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        this.loginSuccess(this.currentUser);
      } catch (e) {
        this.modules.auth.logout();
      }
    } else {
      this.showLogin();
    }
  },

  // Mostrar la pantalla de Login
  showLogin: function() {
    this.currentUser = null;
    localStorage.removeItem('meycif_session');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').classList.add('hidden');
  },

  // Éxito al autenticarse
  loginSuccess: function(user) {
    this.currentUser = user;
    localStorage.setItem('meycif_session', JSON.stringify(user));
    
    // Ocultar login, mostrar app
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Cargar perfil del usuario en cabecera
    document.getElementById('user-display-name').textContent = user.nombre;
    document.getElementById('user-display-role').textContent = user.rol;
    document.getElementById('user-avatar-tag').textContent = user.nombre.charAt(0).toUpperCase();

    // Restricciones de Navegación según Rol
    const adminElements = document.querySelectorAll('.admin-only');
    if (user.rol === 'Administrador') {
      adminElements.forEach(el => el.classList.remove('hidden'));
    } else {
      adminElements.forEach(el => el.classList.add('hidden'));
    }

    // Cargar Dashboard por defecto
    this.renderView('dashboard');
  },

  // Helper centralizado para peticiones fetch (Método api)
  api: async function(url, options = {}) {
    const headers = options.headers || {};
    // Inyectar rol del usuario logueado en las cabeceras para validación del backend
    if (this.currentUser) {
      headers['x-user-role'] = this.currentUser.rol;
    }
    headers['Content-Type'] = 'application/json';
    
    const fetchOptions = {
      ...options,
      headers
    };

    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ocurrió un error en el servidor.');
    }
    return data;
  },

  // Alias para retrocompatibilidad
  fetchAPI: async function(url, options = {}) {
    return this.api(url, options);
  },

  // Navegar y renderizar un módulo del SPA
  renderView: function(viewName) {
    // Validar autorización de rol administrador
    if ((viewName === 'reports' || viewName === 'users') && this.currentUser && this.currentUser.rol !== 'Administrador') {
      alert("Acceso Denegado: Su rol de Vendedor no cuenta con permisos para ver este módulo.");
      this.renderView('dashboard');
      return;
    }

    this.activeModule = viewName;

    // Actualizar estados visuales de enlaces del menú
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const activeNavMap = {
      'dashboard': 'nav-dashboard',
      'products': 'nav-products',
      'stock': 'nav-stock',
      'customers': 'nav-customers',
      'suppliers': 'nav-suppliers',
      'sales': 'nav-sales',
      'reports': 'nav-reports',
      'users': 'nav-users'
    };
    const activeEl = document.getElementById(activeNavMap[viewName]);
    if (activeEl) activeEl.classList.add('active');

    // Cambiar título de página en cabecera
    const titleMap = {
      'dashboard': 'Dashboard General',
      'products': 'Catálogo de Calzados',
      'stock': 'Control de Stock e Inventarios',
      'customers': 'Gestión de Clientes',
      'suppliers': 'Gestión de Proveedores',
      'sales': 'Punto de Venta / Facturación',
      'reports': 'Reportes Comerciales e Ingresos',
      'users': 'Administración de Usuarios'
    };
    document.getElementById('page-title').textContent = titleMap[viewName] || 'Sistema Meycif';

    // Ejecutar render del módulo
    const container = document.getElementById('dynamic-content');
    container.innerHTML = `<div class="loading-spinner">Cargando módulo...</div>`;
    
    if (this.modules[viewName] && typeof this.modules[viewName].render === 'function') {
      try {
        this.modules[viewName].render(container);
      } catch (err) {
        console.error(`Error al renderizar módulo ${viewName}:`, err);
        container.innerHTML = `<div class="error-msg">Ocurrió un error al cargar la vista: ${err.message}</div>`;
      }
    } else {
      container.innerHTML = `<div class="error-msg">Módulo "${viewName}" en desarrollo.</div>`;
    }
  },

  // Alias para retrocompatibilidad
  navigateTo: function(moduleName) {
    this.renderView(moduleName);
  },

  // Helper para abrir Modales
  showModal: function(title, htmlContent, onOpenCallback = null) {
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body-content');
    body.innerHTML = htmlContent;
    document.getElementById('global-modal').classList.remove('hidden');
    if (onOpenCallback) onOpenCallback(body);
  },

  // Helper para cerrar Modales
  closeModal: function() {
    document.getElementById('global-modal').classList.add('hidden');
    document.getElementById('modal-body-content').innerHTML = '';
  }
};

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => window.App.init());
