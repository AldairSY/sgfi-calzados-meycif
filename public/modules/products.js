/* ==========================================================================
   MÓDULO: CATÁLOGO DE CALZADOS (RF-02, RF-04)
   ========================================================================== */

window.App.registerModule("products", {
  productsList: [],

  render: async function(container) {
    const canEdit = App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Almacenero';
    this.config = await App.fetchAPI('/api/config').catch(() => null);
    
    let html = `
      <div class="search-filter-bar">
        <!-- Input de búsqueda por texto libre -->
        <div class="search-input-wrapper" style="min-width: 250px;">
          <input type="text" id="prod-search-txt" placeholder="Buscar por SKU, modelo, marca o color..." style="height: 100%;">
        </div>
        
        <!-- Filtro por Talla -->
        <div style="width: 120px;">
          <select id="prod-filter-talla">
            <option value="">Talla (Todas)</option>
            <option value="37">37</option>
            <option value="38">38</option>
            <option value="39">39</option>
            <option value="40">40</option>
            <option value="41">41</option>
            <option value="42">42</option>
          </select>
        </div>

        <!-- Filtro por Categoría -->
        <div style="width: 160px;">
          <select id="prod-filter-cat">
            <option value="">Categoría (Todas)</option>
            <option value="Urbano">Urbano</option>
            <option value="Deportivo">Deportivo</option>
            <option value="Formal">Formal</option>
            <option value="Escolar">Escolar</option>
          </select>
        </div>

        <!-- Filtro por Disponibilidad -->
        <div style="width: 160px;">
          <select id="prod-filter-stock">
            <option value="">Stock (Todos)</option>
            <option value="disponible">Con Stock</option>
            <option value="critico">Stock Bajo/Agotado</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-prod-clear">Limpiar Filtros</button>

        <!-- Botón de Registro Exclusivo Admin y Almacenero -->
        ${canEdit ? `<button class="btn btn-primary" id="btn-prod-add" style="margin-left: auto;">👞 Registrar Calzado</button>` : ''}
      </div>

      <div class="card">
        <h3 class="card-title">Listado de Calzados</h3>
        <div class="table-responsive" id="products-table-container">
          <div class="loading-spinner">Cargando catálogo...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar productos desde la API
    await this.loadAndRenderTable();

    // Enlazar eventos de búsqueda y filtrado
    document.getElementById('prod-search-txt').addEventListener('input', () => this.filterProducts());
    document.getElementById('prod-filter-talla').addEventListener('change', () => this.filterProducts());
    document.getElementById('prod-filter-cat').addEventListener('change', () => this.filterProducts());
    document.getElementById('prod-filter-stock').addEventListener('change', () => this.filterProducts());
    document.getElementById('btn-prod-clear').addEventListener('click', () => {
      document.getElementById('prod-search-txt').value = '';
      document.getElementById('prod-filter-talla').value = '';
      document.getElementById('prod-filter-cat').value = '';
      document.getElementById('prod-filter-stock').value = '';
      this.filterProducts();
    });

    if (canEdit) {
      document.getElementById('btn-prod-add').addEventListener('click', () => this.openAddModal());
    }
  },

  // Cargar productos del servidor y renderizar la tabla
  loadAndRenderTable: async function() {
    try {
      this.productsList = await App.fetchAPI('/api/products');
      this.filterProducts();
    } catch (err) {
      console.error("Error al cargar productos:", err);
      document.getElementById('products-table-container').innerHTML = `
        <div class="error-msg">Error al cargar productos: ${err.message}</div>
      `;
    }
  },

  // Filtrado reactivo en el cliente (RF-04)
  filterProducts: function() {
    const searchTxt = document.getElementById('prod-search-txt').value.toLowerCase();
    const tallaVal = document.getElementById('prod-filter-talla').value;
    const catVal = document.getElementById('prod-filter-cat').value;
    const stockVal = document.getElementById('prod-filter-stock').value;

    const filtered = this.productsList.filter(p => {
      // Búsqueda por texto (código interno, marca, modelo, color)
      const matchesSearch = 
        p.codigo_interno.toLowerCase().includes(searchTxt) ||
        p.marca.toLowerCase().includes(searchTxt) ||
        p.modelo.toLowerCase().includes(searchTxt) ||
        p.color.toLowerCase().includes(searchTxt);
      
      // Filtro por talla
      const matchesTalla = tallaVal === "" || p.talla === tallaVal;

      // Filtro por categoría
      const matchesCat = catVal === "" || p.categoria === catVal;

      // Filtro por disponibilidad de stock
      let matchesStock = true;
      if (stockVal === 'disponible') {
        matchesStock = p.stock > 0;
      } else if (stockVal === 'critico') {
        matchesStock = p.stock <= p.stock_minimo;
      }

      return matchesSearch && matchesTalla && matchesCat && matchesStock;
    });

    this.renderTable(filtered);
  },

  // Renderizar la tabla de productos filtrados
  renderTable: function(list) {
    const container = document.getElementById('products-table-container');
    const canEdit = App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Almacenero';
    const moneda = this.config ? this.config.moneda : 'S/.';

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se encontraron calzados con los filtros seleccionados.</div>`;
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
            <th style="text-align: right;">Precio</th>
            <th style="text-align: center;">Stock Mínimo</th>
            <th style="text-align: center;">Stock Actual</th>
            <th style="text-align: center;">Estado</th>
            ${canEdit ? `<th style="text-align: center;">Acciones</th>` : ''}
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(p => {
      const isLowStock = p.stock <= p.stock_minimo && p.estado === 'Activo';
      const statusBadge = p.estado === 'Activo' 
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-danger">Inactivo</span>`;

      tableHtml += `
        <tr style="${isLowStock ? 'background-color: rgba(239, 68, 68, 0.04);' : ''}">
          <td><code>${p.codigo_interno}</code></td>
          <td><strong>${p.categoria}</strong></td>
          <td>${p.marca}</td>
          <td>${p.modelo}</td>
          <td>${p.talla}</td>
          <td>${p.color}</td>
          <td style="text-align: right; font-weight: 500;">${moneda} ${p.precio.toFixed(2)}</td>
          <td style="text-align: center;">${p.stock_minimo}</td>
          <td style="text-align: center; font-weight: bold; ${isLowStock ? 'color: var(--danger-color);' : ''}">
            ${p.stock} ${isLowStock ? '⚠️' : ''}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          ${canEdit ? `
            <td style="text-align: center; white-space: nowrap;">
              <button class="btn btn-secondary btn-sm" onclick="App.modules.products.openEditModal(${p.id})">Editar</button>
              ${p.estado === 'Activo' 
                ? `<button class="btn btn-danger btn-sm" onclick="App.modules.products.deactivateProduct(${p.id})">Baja</button>`
                : `<button class="btn btn-success btn-sm" onclick="App.modules.products.activateProduct(${p.id})">Activar</button>`
              }
            </td>
          ` : ''}
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  },

  // Modal para agregar producto (RF-02)
  openAddModal: function() {
    const formHtml = `
      <form id="product-form">
        <div class="form-row">
          <div class="form-group">
            <label for="prod-sku">Código SKU / Interno</label>
            <input type="text" id="prod-sku" placeholder="Ej. SKU-101" required>
          </div>
          <div class="form-group">
            <label for="prod-cat">Categoría</label>
            <select id="prod-cat" required>
              <option value="Urbano">Urbano</option>
              <option value="Deportivo">Deportivo</option>
              <option value="Formal">Formal</option>
              <option value="Escolar">Escolar</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="prod-marca">Marca</label>
            <input type="text" id="prod-marca" placeholder="Ej. Nike, Adidas" required>
          </div>
          <div class="form-group">
            <label for="prod-modelo">Modelo</label>
            <input type="text" id="prod-modelo" placeholder="Ej. Air Force 1" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="prod-talla">Talla</label>
            <input type="text" id="prod-talla" placeholder="Ej. 38, 40" required>
          </div>
          <div class="form-group">
            <label for="prod-color">Color</label>
            <input type="text" id="prod-color" placeholder="Ej. Negro, Blanco" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="prod-precio">Precio (S/.)</label>
            <input type="number" id="prod-precio" step="0.1" min="1" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label for="prod-stock">Stock Inicial</label>
            <input type="number" id="prod-stock" min="0" placeholder="0" required>
          </div>
          <div class="form-group">
            <label for="prod-stock-min">Stock Mínimo</label>
            <input type="number" id="prod-stock-min" min="1" placeholder="3" required>
          </div>
        </div>

        <div id="product-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Calzado</button>
        </div>
      </form>
    `;

    App.showModal("Registrar Nuevo Calzado", formHtml, (body) => {
      document.getElementById('product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveNewProduct();
      });
    });
  },

  // Guardar nuevo producto en el servidor
  saveNewProduct: async function() {
    const errorEl = document.getElementById('product-modal-error');
    errorEl.classList.add('hidden');

    const prodData = {
      codigo_interno: document.getElementById('prod-sku').value.trim(),
      categoria: document.getElementById('prod-cat').value,
      marca: document.getElementById('prod-marca').value.trim(),
      modelo: document.getElementById('prod-modelo').value.trim(),
      talla: document.getElementById('prod-talla').value.trim(),
      color: document.getElementById('prod-color').value.trim(),
      precio: parseFloat(document.getElementById('prod-precio').value),
      stock: parseInt(document.getElementById('prod-stock').value),
      stock_minimo: parseInt(document.getElementById('prod-stock-min').value),
      estado: "Activo"
    };

    // Validaciones en cliente
    if (!prodData.codigo_interno) {
      errorEl.textContent = "El código SKU es obligatorio.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (prodData.precio <= 0 || isNaN(prodData.precio)) {
      errorEl.textContent = "El precio debe ser un número positivo.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (prodData.stock < 0 || isNaN(prodData.stock)) {
      errorEl.textContent = "El stock inicial no puede ser negativo.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (prodData.stock_minimo < 1 || isNaN(prodData.stock_minimo)) {
      errorEl.textContent = "El stock mínimo debe ser al menos 1 unidad.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/products', {
        method: 'POST',
        body: JSON.stringify(prodData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Modal para editar producto
  openEditModal: function(id) {
    const p = this.productsList.find(item => item.id === parseInt(id));
    if (!p) return;

    const formHtml = `
      <form id="product-edit-form">
        <div class="form-row">
          <div class="form-group">
            <label for="prod-sku">Código SKU / Interno</label>
            <input type="text" id="prod-sku" value="${p.codigo_interno}" required>
          </div>
          <div class="form-group">
            <label for="prod-cat">Categoría</label>
            <select id="prod-cat" required>
              <option value="Urbano" ${p.categoria === 'Urbano' ? 'selected' : ''}>Urbano</option>
              <option value="Deportivo" ${p.categoria === 'Deportivo' ? 'selected' : ''}>Deportivo</option>
              <option value="Formal" ${p.categoria === 'Formal' ? 'selected' : ''}>Formal</option>
              <option value="Escolar" ${p.categoria === 'Escolar' ? 'selected' : ''}>Escolar</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="prod-marca">Marca</label>
            <input type="text" id="prod-marca" value="${p.marca}" required>
          </div>
          <div class="form-group">
            <label for="prod-modelo">Modelo</label>
            <input type="text" id="prod-modelo" value="${p.modelo}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="prod-talla">Talla</label>
            <input type="text" id="prod-talla" value="${p.talla}" required>
          </div>
          <div class="form-group">
            <label for="prod-color">Color</label>
            <input type="text" id="prod-color" value="${p.color}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="prod-precio">Precio (S/.)</label>
            <input type="number" id="prod-precio" step="0.1" min="1" value="${p.precio}" required>
          </div>
          <div class="form-group">
            <label for="prod-stock-min">Stock Mínimo</label>
            <input type="number" id="prod-stock-min" min="1" value="${p.stock_minimo}" required>
          </div>
        </div>

        <div id="product-modal-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    `;

    App.showModal("Editar Calzado", formHtml, (body) => {
      document.getElementById('product-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEditProduct(id);
      });
    });
  },

  // Guardar edición de producto
  saveEditProduct: async function(id) {
    const errorEl = document.getElementById('product-modal-error');
    errorEl.classList.add('hidden');

    const prodData = {
      codigo_interno: document.getElementById('prod-sku').value.trim(),
      categoria: document.getElementById('prod-cat').value,
      marca: document.getElementById('prod-marca').value.trim(),
      modelo: document.getElementById('prod-modelo').value.trim(),
      talla: document.getElementById('prod-talla').value.trim(),
      color: document.getElementById('prod-color').value.trim(),
      precio: parseFloat(document.getElementById('prod-precio').value),
      stock_minimo: parseInt(document.getElementById('prod-stock-min').value)
    };

    if (!prodData.codigo_interno) {
      errorEl.textContent = "El código SKU es obligatorio.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (prodData.precio <= 0 || isNaN(prodData.precio)) {
      errorEl.textContent = "El precio debe ser un número positivo.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (prodData.stock_minimo < 1 || isNaN(prodData.stock_minimo)) {
      errorEl.textContent = "El stock mínimo debe ser al menos 1 unidad.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(prodData)
      });
      App.closeModal();
      this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Dar de Baja Lógica (RF-02)
  deactivateProduct: async function(id) {
    if (!confirm("¿Está seguro de dar de baja este calzado del catálogo activo?")) return;
    try {
      await App.fetchAPI(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: "Inactivo" })
      });
      this.loadAndRenderTable();
    } catch (err) {
      alert("Error al dar de baja: " + err.message);
    }
  },

  // Activar producto
  activateProduct: async function(id) {
    try {
      await App.fetchAPI(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: "Activo" })
      });
      this.loadAndRenderTable();
    } catch (err) {
      alert("Error al activar: " + err.message);
    }
  }
});
