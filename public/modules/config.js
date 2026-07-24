/* ==========================================================================
   MÓDULO: CONFIGURACIÓN BÁSICA DEL SISTEMA (EXCLUSIVO ADMINISTRADOR) (RF-14)
   ========================================================================== */

window.App.registerModule("config", {
  render: async function(container) {
    let html = `
      <div style="max-width: 650px; margin: 0 auto;">
        <div class="card">
          <h3 class="card-title">Parámetros del Sistema y Empresa</h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
            Modifique los datos principales de la empresa. Estos datos se aplicarán de manera inmediata a la impresión de boletas, facturas, etiquetas y cálculos de impuestos del punto de venta.
          </p>
          
          <form id="config-form">
            <div class="form-group">
              <label for="conf-name">Nombre Comercial / Razón Social</label>
              <input type="text" id="conf-name" placeholder="Ej. Calzados Meycif S.A.C." required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="conf-ruc">RUC de la Empresa</label>
                <input type="text" id="conf-ruc" maxlength="11" placeholder="Ej. 20601020304" required>
              </div>
              <div class="form-group">
                <label for="conf-phone">Teléfono de Contacto</label>
                <input type="text" id="conf-phone" placeholder="Ej. (01) 425-6374" required>
              </div>
            </div>

            <div class="form-group">
              <label for="conf-address">Dirección Fiscal</label>
              <input type="text" id="conf-address" placeholder="Ej. Jr. Junín 1025, Cercado de Lima" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="conf-igv">Tasa del IGV (%)</label>
                <input type="number" id="conf-igv" min="0" max="100" step="0.5" placeholder="18.0" required>
              </div>
              <div class="form-group">
                <label for="conf-currency">Moneda del Sistema</label>
                <select id="conf-currency" required>
                  <option value="S/.">Soles (S/.)</option>
                  <option value="$">Dólares ($)</option>
                  <option value="€">Euros (€)</option>
                </select>
              </div>
            </div>

            <div id="config-error" class="error-msg hidden"></div>
            <div id="config-success" class="badge badge-success hidden" style="width: 100%; display: block; text-align: center; padding: 10px; font-size: 13px; margin-bottom: 15px;">
              Configuración guardada correctamente.
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
              <button type="submit" class="btn btn-primary btn-block">Guardar Parámetros Generales</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar parámetros
    await this.loadConfig();

    // Eventos
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfig();
    });
  },

  // Cargar configuración actual de SQLite
  loadConfig: async function() {
    try {
      const config = await App.fetchAPI('/api/config');
      if (config) {
        document.getElementById('conf-name').value = config.nombre_empresa;
        document.getElementById('conf-ruc').value = config.ruc_empresa;
        document.getElementById('conf-phone').value = config.telefono_empresa;
        document.getElementById('conf-address').value = config.direccion_empresa;
        document.getElementById('conf-igv').value = config.igv;
        document.getElementById('conf-currency').value = config.moneda;
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
      const errEl = document.getElementById('config-error');
      errEl.textContent = "Error al conectar con la base de datos de configuración: " + err.message;
      errEl.classList.remove('hidden');
    }
  },

  // Guardar configuración modificada en SQLite
  saveConfig: async function() {
    const errorEl = document.getElementById('config-error');
    const successEl = document.getElementById('config-success');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const configData = {
      nombre_empresa: document.getElementById('conf-name').value.trim(),
      ruc_empresa: document.getElementById('conf-ruc').value.trim(),
      telefono_empresa: document.getElementById('conf-phone').value.trim(),
      direccion_empresa: document.getElementById('conf-address').value.trim(),
      igv: parseFloat(document.getElementById('conf-igv').value),
      moneda: document.getElementById('conf-currency').value
    };

    // Validar RUC (11 dígitos)
    if (!/^\d{11}$/.test(configData.ruc_empresa)) {
      errorEl.textContent = "El RUC de la empresa debe contener exactamente 11 dígitos numéricos.";
      errorEl.classList.remove('hidden');
      return;
    }

    if (configData.igv < 0 || configData.igv > 100 || isNaN(configData.igv)) {
      errorEl.textContent = "La tasa del IGV debe estar en el rango de 0% a 100%.";
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await App.fetchAPI('/api/config', {
        method: 'PUT',
        body: JSON.stringify(configData)
      });
      
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 3000);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
});
