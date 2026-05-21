/* ==========================================================================
   MÓDULO: CONTROL DE STOCK E INVENTARIOS (RF-03)
   ========================================================================== */

window.App.registerModule("stock", {
  productsList: [],

  render: async function(container) {
    let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
        <!-- Panel Izquierdo: Formulario de Registro de Movimiento de Stock -->
        <div class="card">
          <h3 class="card-title">Registrar Movimiento de Inventario</h3>
          <form id="stock-movement-form">
            <div class="form-group">
              <label for="stock-prod-select">Seleccione Calzado</label>
              <select id="stock-prod-select" required>
                <option value="">Seleccione un calzado del inventario...</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="stock-mov-type">Tipo de Movimiento</label>
                <select id="stock-mov-type" required>
                  <option value="Ingreso">Ingreso (Reabastecimiento de Almacén)</option>
                  <option value="Salida">Salida (Ajuste / Pérdida / Devolución)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="stock-mov-qty">Cantidad</label>
                <input type="number" id="stock-mov-qty" min="1" placeholder="Ej. 10" required>
              </div>
            </div>

            <div class="form-group">
              <label for="stock-mov-reason">Motivo / Descripción</label>
              <select id="stock-mov-reason" required>
                <option value="Reabastecimiento">Reabastecimiento (Compra de stock)</option>
                <option value="Ajuste">Ajuste por inventario físico</option>
                <option value="Devolución">Devolución de cliente</option>
                <option value="Descarte">Descarte por calzado dañado</option>
              </select>
            </div>

            <div id="stock-mov-error" class="error-msg hidden"></div>

            <button type="submit" class="btn btn-primary btn-block">Aplicar Movimiento al Inventario</button>
          </form>
        </div>

        <!-- Panel Derecho: Resumen Informativo de Existencias y Alertas -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 class="card-title">Estado de Almacén y Alertas</h3>
            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
              <p style="margin-bottom: 8px;">• Los <strong>Ingresos</strong> sumarán existencias físicas al producto seleccionado de inmediato.</p>
              <p style="margin-bottom: 8px;">• Las <strong>Salidas</strong> disminuirán el stock y están sujetas a validación de stock disponible.</p>
              <p style="margin-bottom: 8px;">• Cuando un calzado se encuentra por debajo de su stock mínimo, aparecerá destacado con una alerta preventiva roja ⚠️.</p>
            </div>
          </div>
          
          <div id="stock-summary-stats" style="background-color: var(--bg-color); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
            <!-- Stats dinámicos -->
            Cargando estadísticas...
          </div>
        </div>
      </div>

      <!-- Historial Completo de Movimientos (Auditoría) -->
      <div class="card">
        <h3 class="card-title">Historial de Movimientos de Stock (Log de Auditoría)</h3>
        <div class="table-responsive" id="stock-log-container">
          <div class="loading-spinner">Cargando bitácora de movimientos...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar datos
    await this.loadData();

    // Evento del formulario
    document.getElementById('stock-movement-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitMovement();
    });
  },

  // Cargar productos y bitácora de movimientos
  loadData: async function() {
    try {
      this.productsList = await App.fetchAPI('/api/products');
      const movements = await App.fetchAPI('/api/stock/movements');
      const users = await App.fetchAPI('/api/users').catch(() => []); // Admin only, handle fallback

      // Población del Selector de Calzados (Solo productos activos)
      const select = document.getElementById('stock-prod-select');
      select.innerHTML = '<option value="">Seleccione un calzado del inventario...</option>';
      
      const activeProducts = this.productsList.filter(p => p.estado === 'Activo');
      activeProducts.forEach(p => {
        select.innerHTML += `
          <option value="${p.id}">${p.marca} ${p.modelo} (${p.color}, Talla ${p.talla}) [Stock actual: ${p.stock}]</option>
        `;
      });

      // Actualizar Estadísticas del almacén
      const totalStock = this.productsList.reduce((sum, p) => sum + p.stock, 0);
      const lowStockCount = this.productsList.filter(p => p.estado === 'Activo' && p.stock <= p.stock_minimo).length;
      
      document.getElementById('stock-summary-stats').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; gap: 15px;">
          <div>
            <span style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-secondary);">Total Unidades Físicas</span>
            <span style="font-size: 24px; font-weight: bold; color: var(--primary-color);">${totalStock}</span>
          </div>
          <div>
            <span style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-secondary);">Calzados en Alerta</span>
            <span style="font-size: 24px; font-weight: bold; color: ${lowStockCount > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">${lowStockCount}</span>
          </div>
        </div>
      `;

      // Renderizar el log de auditoría histórico
      this.renderMovementsLog(movements, users);

    } catch (err) {
      console.error("Error al cargar datos de inventarios:", err);
    }
  },

  // Renderizar la tabla de historial de auditoría
  renderMovementsLog: function(movements, users) {
    const container = document.getElementById('stock-log-container');
    if (movements.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registran movimientos históricos en la bitácora.</div>`;
      return;
    }

    // Ordenar de más reciente a más antiguo
    movements.sort((a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Fecha y Hora</th>
            <th>Calzado Afectado</th>
            <th style="text-align: center;">Tipo</th>
            <th style="text-align: center;">Cantidad</th>
            <th>Motivo</th>
            <th>Registrado por</th>
          </tr>
        </thead>
        <tbody>
    `;

    movements.forEach(m => {
      const prod = this.productsList.find(p => p.id === m.producto_id);
      const user = users.find(u => u.id === m.usuario_id);
      
      const typeBadge = m.tipo_movimiento === 'Ingreso'
        ? `<span class="badge badge-success">+ Ingreso</span>`
        : `<span class="badge badge-danger">- Salida</span>`;

      const formattedDate = new Date(m.fecha_movimiento).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      tableHtml += `
        <tr>
          <td>${formattedDate}</td>
          <td><strong>${prod ? `${prod.marca} ${prod.modelo}` : 'Calzado no identificado'}</strong> (${prod ? `${prod.color}, Talla ${prod.talla}` : '-'})</td>
          <td style="text-align: center;">${typeBadge}</td>
          <td style="text-align: center; font-weight: bold;">${m.cantidad} uds</td>
          <td>${m.motivo}</td>
          <td>${user ? user.nombre : `ID Usuario: ${m.usuario_id}`}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  },

  // Enviar nuevo movimiento de stock (RF-03)
  submitMovement: async function() {
    const errorEl = document.getElementById('stock-mov-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const movData = {
      producto_id: parseInt(document.getElementById('stock-prod-select').value),
      tipo_movimiento: document.getElementById('stock-mov-type').value,
      cantidad: parseInt(document.getElementById('stock-mov-qty').value),
      motivo: document.getElementById('stock-mov-reason').value,
      usuario_id: App.currentUser.id
    };

    if (!movData.producto_id) {
      errorEl.textContent = "Debe seleccionar un calzado de la lista.";
      errorEl.classList.remove('hidden');
      return;
    }
    if (movData.cantidad <= 0 || isNaN(movData.cantidad)) {
      errorEl.textContent = "La cantidad debe ser un número entero mayor a cero.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/stock/movement', {
        method: 'POST',
        body: JSON.stringify(movData)
      });
      
      // Limpiar formulario y recargar datos
      document.getElementById('stock-prod-select').value = '';
      document.getElementById('stock-mov-qty').value = '';
      document.getElementById('stock-mov-reason').value = 'Reabastecimiento';
      
      alert("Movimiento de inventario aplicado con éxito.");
      await this.loadData();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
});
