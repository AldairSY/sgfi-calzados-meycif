/* ==========================================================================
   MÓDULO: COMPROBANTES DE FACTURACIÓN INTERNA E IMPRESIÓN (RF-06)
   ========================================================================== */

window.App.registerModule("billing", {
  comprobantesList: [],

  render: async function(container) {
    const isAllowed = App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Vendedor';
    
    let html = `
      <div class="search-filter-bar">
        <!-- Búsqueda libre -->
        <div class="search-input-wrapper" style="min-width: 250px;">
          <input type="text" id="comp-search-txt" placeholder="Buscar por número o cliente..." style="height: 100%;">
        </div>
        
        <!-- Filtro tipo -->
        <div style="width: 160px;">
          <select id="comp-filter-type">
            <option value="">Tipo (Todos)</option>
            <option value="Boleta">Boleta</option>
            <option value="Factura">Factura</option>
          </select>
        </div>

        <!-- Filtro estado -->
        <div style="width: 160px;">
          <select id="comp-filter-status">
            <option value="">Estado (Todos)</option>
            <option value="Emitido">Emitido</option>
            <option value="Anulado">Anulado</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-comp-clear">Limpiar Filtros</button>
      </div>

      <div class="card">
        <h3 class="card-title">Listado de Comprobantes Internos</h3>
        <div class="table-responsive" id="comprobantes-table-container">
          <div class="loading-spinner">Cargando comprobantes...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar y listar comprobantes
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('comp-search-txt').addEventListener('input', () => this.filterComprobantes());
    document.getElementById('comp-filter-type').addEventListener('change', () => this.filterComprobantes());
    document.getElementById('comp-filter-status').addEventListener('change', () => this.filterComprobantes());
    document.getElementById('btn-comp-clear').addEventListener('click', () => {
      document.getElementById('comp-search-txt').value = '';
      document.getElementById('comp-filter-type').value = '';
      document.getElementById('comp-filter-status').value = '';
      this.filterComprobantes();
    });
  },

  // Cargar comprobantes de la API
  loadAndRenderTable: async function() {
    try {
      this.comprobantesList = await App.fetchAPI('/api/comprobantes');
      this.config = await App.fetchAPI('/api/config').catch(() => null);
      this.filterComprobantes();
    } catch (err) {
      console.error("Error al cargar comprobantes:", err);
      document.getElementById('comprobantes-table-container').innerHTML = `
        <div class="error-msg">Error al cargar comprobantes: ${err.message}</div>
      `;
    }
  },

  // Filtrar comprobantes
  filterComprobantes: function() {
    const searchTxt = document.getElementById('comp-search-txt').value.toLowerCase();
    const typeVal = document.getElementById('comp-filter-type').value;
    const statusVal = document.getElementById('comp-filter-status').value;

    const filtered = this.comprobantesList.filter(c => {
      const formattedNum = `${c.serie}-${String(c.numero).padStart(6, '0')}`;
      const matchesSearch = 
        formattedNum.toLowerCase().includes(searchTxt) ||
        (c.cliente_nombre && c.cliente_nombre.toLowerCase().includes(searchTxt));

      const matchesType = typeVal === '' || c.tipo_comprobante === typeVal;
      const matchesStatus = statusVal === '' || c.estado === statusVal;

      return matchesSearch && matchesType && matchesStatus;
    });

    this.renderTable(filtered);
  },

  // Renderizar tabla
  renderTable: function(list) {
    const container = document.getElementById('comprobantes-table-container');
    const isWriteAllowed = App.currentUser.rol === 'Administrador' || App.currentUser.rol === 'Vendedor';
    const moneda = this.config ? this.config.moneda : 'S/.';

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se encontraron comprobantes registrados.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Nº Comprobante</th>
            <th>Tipo</th>
            <th>Cliente</th>
            <th>Fecha Emisión</th>
            <th style="text-align: right;">Total</th>
            <th style="text-align: center;">Estado</th>
            <th style="text-align: center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(c => {
      const formattedNum = `${c.serie}-${String(c.numero).padStart(6, '0')}`;
      const dateStr = new Date(c.fecha_emision).toLocaleString('es-PE');
      const statusBadge = c.estado === 'Emitido'
        ? `<span class="badge badge-success">Emitido</span>`
        : `<span class="badge badge-danger" title="Motivo: ${c.motivo_anulacion || 'No especificado'}">Anulado</span>`;

      tableHtml += `
        <tr>
          <td><strong>${formattedNum}</strong></td>
          <td>${c.tipo_comprobante}</td>
          <td>${c.cliente_nombre || 'Cliente Varios'}</td>
          <td>${dateStr}</td>
          <td style="text-align: right; font-weight: bold;">${moneda} ${c.total.toFixed(2)}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="App.modules.billing.showInvoice(${c.venta_id})">Ver / Imprimir</button>
            ${isWriteAllowed && c.estado === 'Emitido'
              ? `<button class="btn btn-danger btn-sm" onclick="App.modules.billing.openAnnulModal(${c.id}, '${formattedNum}')">Anular</button>`
              : ''
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

  // Modal para ingresar motivo de anulación (HU-05)
  openAnnulModal: function(comprobanteId, numComp) {
    const formHtml = `
      <form id="annul-form">
        <p style="margin-bottom: 15px; font-size: 14px;">¿Está seguro de que desea anular el comprobante <strong>${numComp}</strong>? Esta acción devolverá las unidades de calzados vendidas al almacén e inactivará la venta.</p>
        <div class="form-group">
          <label for="annul-reason">Motivo de Anulación</label>
          <textarea id="annul-reason" rows="3" placeholder="Ingrese el motivo detallado de la anulación..." required></textarea>
        </div>
        <div id="annul-modal-error" class="error-msg hidden"></div>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-danger">Confirmar Anulación</button>
        </div>
      </form>
    `;

    App.showModal(`Anular Comprobante ${numComp}`, formHtml, (body) => {
      document.getElementById('annul-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.annulComprobante(comprobanteId);
      });
    });
  },

  // Enviar anulación al backend
  annulComprobante: async function(comprobanteId) {
    const errorEl = document.getElementById('annul-modal-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const motivo = document.getElementById('annul-reason').value.trim();

    try {
      await App.fetchAPI(`/api/comprobantes/${comprobanteId}/anular`, {
        method: 'POST',
        body: JSON.stringify({ motivo })
      });
      App.closeModal();
      alert("Comprobante anulado con éxito y stock retornado al inventario.");
      await this.loadAndRenderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  },

  // Cargar una venta, calcular desgloses y mostrarla en un modal imprimible
  showInvoice: async function(saleId) {
    try {
      const sales = await App.fetchAPI('/api/sales');
      const sale = sales.find(s => s.id === parseInt(saleId));
      if (!sale) throw new Error("Venta no encontrada.");

      const details = await App.fetchAPI(`/api/sales/${saleId}/details`);
      const products = await App.fetchAPI('/api/products');
      const customers = await App.fetchAPI('/api/customers');
      const users = await App.fetchAPI('/api/users').catch(() => []); // Admin fallback
      const config = await App.fetchAPI('/api/config').catch(() => null);

      const client = customers.find(c => c.id === sale.cliente_id);
      const user = users.find(u => u.id === sale.usuario_id);

      const nombreEmpresa = config ? config.nombre_empresa : 'CALZADOS MEYCIF S.A.C.';
      const rucEmpresa = config ? config.ruc_empresa : '20601020304';
      const direccionEmpresa = config ? config.direccion_empresa : 'Jr. Junín 1025, Cercado de Lima';
      const telefonoEmpresa = config ? config.telefono_empresa : '(01) 425-6374';
      const moneda = config ? config.moneda : 'S/.';

      // Cargar comprobante correlativo de SQLite
      const receipts = await App.fetchAPI('/api/comprobantes').catch(() => []);
      const receipt = receipts.find(r => r.venta_id === sale.id);
      
      const correlative = receipt ? String(receipt.numero).padStart(6, '0') : String(sale.id).padStart(6, '0');
      const serie = receipt ? receipt.serie : (sale.tipo_comprobante === 'Boleta' ? 'B001' : 'F001');
      const docName = sale.tipo_comprobante === 'Boleta' ? 'BOLETA DE VENTA INTERNA' : 'FACTURA INTERNA';

      const formattedDate = new Date(sale.fecha_venta).toLocaleString('es-PE');

      // Generar filas de detalles
      let detailsRows = '';
      details.forEach((d, index) => {
        const prod = products.find(p => p.id === d.producto_id);
        const prodName = prod 
          ? `${prod.marca} ${prod.modelo} (${prod.color}, Talla ${prod.talla})` 
          : 'Calzado no identificado';
        
        detailsRows += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${prodName}</td>
            <td style="text-align: center;">${d.cantidad}</td>
            <td style="text-align: right;">${moneda} ${d.precio_unitario.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${moneda} ${d.subtotal.toFixed(2)}</td>
          </tr>
        `;
      });

      const invoiceHtml = `
        <div class="invoice-box" id="printable-invoice">
          <div class="invoice-header">
            <h1>${nombreEmpresa}</h1>
            <p>RUC de Control: ${rucEmpresa}</p>
            <p>Dirección: ${direccionEmpresa}</p>
            <p>Teléfono: ${telefonoEmpresa}</p>
            <h2 style="margin-top: 15px; font-size: 16px; font-weight: bold; text-decoration: underline;">
              ${docName} Nº ${serie}-${correlative}
            </h2>
          </div>

          <div class="invoice-info-grid">
            <div>
              <p><strong>Fecha Emisión:</strong> ${formattedDate}</p>
              <p><strong>Cajero:</strong> ${user ? user.nombre : 'Usuario Sistema'}</p>
              <p><strong>Estado:</strong> ${sale.estado}</p>
            </div>
            <div>
              <p><strong>Cliente:</strong> ${client ? client.nombres_razon_social : 'CLIENTE VARIOS'}</p>
              <p><strong>${client ? client.tipo_documento : 'DNI'}:</strong> ${client ? client.numero_documento : '12345678'}</p>
              <p><strong>Dirección:</strong> ${client && client.direccion ? client.direccion : '-'}</p>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Item</th>
                <th>Descripción Calzado</th>
                <th style="width: 60px; text-align: center;">Cant.</th>
                <th style="width: 90px; text-align: right;">P. Unit</th>
                <th style="width: 100px; text-align: right;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${detailsRows}
            </tbody>
          </table>

          <div class="invoice-totals">
            <div class="invoice-totals-row">
              <span>Subtotal:</span>
              <span>${moneda} ${sale.subtotal.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row" style="color: red;">
              <span>Descuento aplicado:</span>
              <span>- ${moneda} ${sale.descuento.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row" style="font-weight: bold;">
              <span>Base Imponible:</span>
              <span>${moneda} ${(sale.subtotal - sale.descuento).toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row">
              <span>IGV (${config ? config.igv : 18.0}%):</span>
              <span>${moneda} ${sale.igv.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row total">
              <span>Total Neto a Pagar:</span>
              <span>${moneda} ${sale.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="invoice-warning-block">
            DOCUMENTO DE CONTROL INTERNO - NO VÁLIDO PARA SUNAT<br>
            EMISIÓN EXCLUSIVAMENTE LOCAL SIN ENVÍO A ENTIDADES TRIBUTARIAS
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;" class="no-print">
          <button class="btn btn-secondary" onclick="App.closeModal()">Cerrar</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir Comprobante</button>
        </div>
      `;

      App.showModal(`${docName} Local`, invoiceHtml);

    } catch (err) {
      alert("Error al recuperar comprobante: " + err.message);
    }
  }
});
