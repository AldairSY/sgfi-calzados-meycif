/* ==========================================================================
   MÓDULO: PUNTO DE VENTA, CARRITO DE COMPRAS E IMPORTES (RF-04, RF-05, RF-06)
   ========================================================================== */

window.App.registerModule("sales", {
  productsList: [],
  clientsList: [],
  cart: [], // Ítems añadidos al carrito
  selectedClient: null,

  render: async function(container) {
    // Inicializar estado del módulo al cargar
    this.cart = [];
    this.selectedClient = null;

    let html = `
      <div class="sales-layout">
        <!-- Panel Izquierdo: Catálogo y Búsqueda de Calzados -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 15px;">
          <h3 class="card-title" style="margin-bottom: 0;">Selección de Calzados</h3>
          
          <div class="search-filter-bar" style="padding: 10px; margin-bottom: 0; gap: 10px; border: 1px solid var(--border-color);">
            <div class="search-input-wrapper">
              <input type="text" id="sales-search-txt" placeholder="Buscar modelo, marca, color..." style="height: 100%; font-size: 13px; padding: 6px 10px;">
            </div>
            <div style="width: 110px;">
              <select id="sales-filter-cat" style="font-size: 13px; padding: 6px;">
                <option value="">Categoría</option>
                <option value="Urbano">Urbano</option>
                <option value="Deportivo">Deportivo</option>
                <option value="Formal">Formal</option>
                <option value="Escolar">Escolar</option>
              </select>
            </div>
          </div>

          <div id="sales-products-list" style="flex: 1; overflow-y: auto; max-height: 480px; padding-right: 5px;">
            <!-- Renderizado dinámico de productos disponibles -->
            <div class="loading-spinner">Cargando catálogo de calzados...</div>
          </div>
        </div>

        <!-- Panel Derecho: Carrito de Compras y Cobro -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 15px;">
          <div>
            <h3 class="card-title">Carrito de Compras</h3>
            
            <!-- Listado del Carrito -->
            <div id="cart-items-container" style="max-height: 250px; overflow-y: auto; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
              <div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 13px;">
                El carrito de compras se encuentra vacío. Añada calzados desde el catálogo de la izquierda.
              </div>
            </div>

            <!-- Asociación de Cliente -->
            <div class="card" style="padding: 15px; margin-bottom: 15px; border-color: var(--accent-color); background-color: rgba(197, 168, 128, 0.03);">
              <h4 style="font-size: 13px; font-weight: 600; color: var(--primary-color); margin-bottom: 8px;">Asociar Cliente</h4>
              <div style="display: flex; gap: 10px; align-items: center;">
                <div class="search-input-wrapper">
                  <input type="text" id="sales-client-doc" placeholder="Ingrese DNI (8d) o RUC (11d)..." maxlength="11">
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-sales-client-search" style="padding: 8px 12px;">Buscar</button>
              </div>
              <div id="sales-client-display" style="margin-top: 8px; font-size: 13px; font-weight: bold; color: var(--success-color);">
                <!-- Nombre del cliente asociado -->
                ⚠️ Venta rápida (Sin cliente asociado)
              </div>
              <div id="sales-client-actions" class="hidden" style="margin-top: 6px;">
                <button class="btn btn-accent btn-sm" id="btn-sales-client-register-fast">Registrar Nuevo Cliente</button>
              </div>
            </div>

            <!-- Tipo de Comprobante e Importes -->
            <div class="form-row" style="margin-bottom: 15px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="sales-receipt-type">Comprobante Interno</label>
                <select id="sales-receipt-type">
                  <option value="Boleta">Boleta de Venta Interna</option>
                  <option value="Factura">Factura Interna</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="sales-discount">Descuento Especial (S/.)</label>
                <input type="number" id="sales-discount" min="0" value="0" step="0.5" placeholder="0.00">
              </div>
            </div>

            <!-- Desglose de Importes (Fórmulas RF-06) -->
            <div class="cart-summary">
              <div class="summary-row">
                <span>Subtotal (Suma de precios):</span>
                <span id="summary-subtotal">S/. 0.00</span>
              </div>
              <div class="summary-row">
                <span>Descuento aplicado:</span>
                <span id="summary-discount" style="color: var(--danger-color);">- S/. 0.00</span>
              </div>
              <div class="summary-row" style="font-weight: 500;">
                <span>Base Imponible (Subtotal - Descuento):</span>
                <span id="summary-base">S/. 0.00</span>
              </div>
              <div class="summary-row">
                <span>IGV (18% de Base Imponible):</span>
                <span id="summary-igv">S/. 0.00</span>
              </div>
              <div class="summary-row total">
                <span>Total a Pagar:</span>
                <span id="summary-total">S/. 0.00</span>
              </div>
            </div>
          </div>

          <div id="sales-checkout-error" class="error-msg hidden"></div>

          <button class="btn btn-primary btn-block" id="btn-sales-checkout" style="padding: 12px; font-weight: 600; font-size: 15px;">
            🛒 Procesar Cobro e Imprimir Comprobante
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar datos
    await this.loadData();

    // Eventos de búsqueda de calzados
    document.getElementById('sales-search-txt').addEventListener('input', () => this.filterProducts());
    document.getElementById('sales-filter-cat').addEventListener('change', () => this.filterProducts());

    // Eventos de cliente
    document.getElementById('btn-sales-client-search').addEventListener('click', () => this.searchClient());
    document.getElementById('sales-client-doc').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchClient();
    });

    // Evento para cambio de descuento manual
    document.getElementById('sales-discount').addEventListener('input', () => this.updateTotals());

    // Evento de procesar venta
    document.getElementById('btn-sales-checkout').addEventListener('click', () => this.processCheckout());
  },

  // Cargar catálogos iniciales
  loadData: async function() {
    try {
      this.productsList = await App.fetchAPI('/api/products');
      this.clientsList = await App.fetchAPI('/api/customers');
      this.filterProducts();
    } catch (err) {
      console.error("Error al cargar ventas iniciales:", err);
    }
  },

  // Filtrado de productos en panel de ventas
  filterProducts: function() {
    const searchTxt = document.getElementById('sales-search-txt').value.toLowerCase();
    const catVal = document.getElementById('sales-filter-cat').value;

    const filtered = this.productsList.filter(p => {
      const matchesSearch = 
        p.marca.toLowerCase().includes(searchTxt) ||
        p.modelo.toLowerCase().includes(searchTxt) ||
        p.color.toLowerCase().includes(searchTxt);

      const matchesCat = catVal === "" || p.categoria === catVal;
      
      // Mostrar solo activos
      const isActive = p.estado === 'Activo';

      return matchesSearch && matchesCat && isActive;
    });

    this.renderProductsList(filtered);
  },

  // Renderizar la grilla de productos disponibles para la venta
  renderProductsList: function(list) {
    const container = document.getElementById('sales-products-list');
    
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px;">No se encontraron calzados activos.</div>`;
      return;
    }

    let html = '';
    list.forEach(p => {
      const isAgotado = p.stock <= 0;
      const isLowStock = p.stock <= p.stock_minimo;

      html += `
        <div class="sale-product-item" style="${isAgotado ? 'opacity: 0.6;' : ''}">
          <div class="sale-product-details">
            <h5><strong>${p.marca} ${p.modelo}</strong></h5>
            <p>Categoría: ${p.categoria} | Talla: <strong>${p.talla}</strong> | Color: ${p.color}</p>
            <p style="font-weight: 600; color: var(--primary-color);">S/. ${p.precio.toFixed(2)}</p>
            <span style="font-size: 11px; font-weight: 600; color: ${isAgotado ? 'var(--danger-color)' : isLowStock ? 'var(--warning-color)' : 'var(--success-color)'};">
              Stock actual: ${p.stock} uds ${isAgotado ? '(Agotado)' : isLowStock ? '(¡Stock Bajo!)' : ''}
            </span>
          </div>
          <div>
            ${isAgotado 
              ? `<button class="btn btn-secondary btn-sm" disabled style="cursor: not-allowed;">Sin Stock</button>` 
              : `<button class="btn btn-accent btn-sm" onclick="App.modules.sales.addToCart(${p.id})">Añadir</button>`
            }
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // Añadir un calzado al carrito interactivo (RF-05)
  addToCart: function(productId) {
    const prod = this.productsList.find(p => p.id === parseInt(productId));
    if (!prod) return;

    // Verificar si ya está en el carrito
    const cartIdx = this.cart.findIndex(item => item.producto.id === prod.id);
    if (cartIdx !== -1) {
      // Incrementar cantidad si hay stock suficiente
      if (this.cart[cartIdx].cantidad + 1 > prod.stock) {
        alert(`No es posible agregar más unidades de ${prod.modelo}. Se alcanzó el stock máximo disponible en almacén (${prod.stock} uds).`);
        return;
      }
      this.cart[cartIdx].cantidad++;
    } else {
      // Agregar nuevo ítem
      this.cart.push({
        producto: prod,
        cantidad: 1
      });
    }

    this.renderCart();
    this.updateTotals();
  },

  // Eliminar ítem del carrito
  removeFromCart: function(productId) {
    this.cart = this.cart.filter(item => item.producto.id !== parseInt(productId));
    this.renderCart();
    this.updateTotals();
  },

  // Actualizar cantidad en carrito con validación de stock disponible
  updateCartQuantity: function(productId, qty) {
    const idx = this.cart.findIndex(item => item.producto.id === parseInt(productId));
    if (idx === -1) return;

    const parsedQty = parseInt(qty);
    const prodStock = this.cart[idx].producto.stock;

    if (parsedQty <= 0 || isNaN(parsedQty)) {
      this.removeFromCart(productId);
      return;
    }

    // Validar cantidad máxima contra stock físico real (RF-05)
    if (parsedQty > prodStock) {
      alert(`Stock insuficiente para ${this.cart[idx].producto.modelo}. Cantidad máxima disponible: ${prodStock} uds.`);
      document.getElementById(`cart-qty-${productId}`).value = this.cart[idx].cantidad;
      return;
    }

    this.cart[idx].cantidad = parsedQty;
    this.updateTotals();
  },

  // Renderizar la tabla del carrito
  renderCart: function() {
    const container = document.getElementById('cart-items-container');
    
    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 13px;">
          El carrito de compras se encuentra vacío. Añada calzados desde el catálogo de la izquierda.
        </div>
      `;
      return;
    }

    let tableHtml = `
      <table class="custom-table cart-table" style="font-size: 12px;">
        <thead>
          <tr>
            <th>Calzado</th>
            <th style="width: 80px; text-align: center;">Cant.</th>
            <th style="text-align: right; width: 80px;">P. Unit</th>
            <th style="text-align: right; width: 80px;">Importe</th>
            <th style="width: 40px; text-align: center;"></th>
          </tr>
        </thead>
        <tbody>
    `;

    this.cart.forEach(item => {
      const p = item.producto;
      const sub = item.cantidad * p.precio;

      tableHtml += `
        <tr>
          <td>
            <strong>${p.marca} ${p.modelo}</strong>
            <div style="font-size: 10px; color: var(--text-secondary);">Talla: ${p.talla} | Color: ${p.color}</div>
          </td>
          <td style="text-align: center;">
            <input type="number" id="cart-qty-${p.id}" value="${item.cantidad}" min="1" max="${p.stock}" 
                   style="width: 50px; text-align: center; padding: 3px; font-size: 12px; border-radius: 4px;"
                   onchange="App.modules.sales.updateCartQuantity(${p.id}, this.value)">
          </td>
          <td style="text-align: right;">S/. ${p.precio.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600;">S/. ${sub.toFixed(2)}</td>
          <td style="text-align: center;">
            <button style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 14px;" 
                    onclick="App.modules.sales.removeFromCart(${p.id})">🗑️</button>
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

  // Cálculo automático de importes usando las fórmulas matemáticas requeridas (RF-06)
  updateTotals: function() {
    let subtotal = 0;
    
    // Subtotal = suma de los precios de los productos antes de descuento e IGV
    this.cart.forEach(item => {
      subtotal += item.cantidad * item.producto.precio;
    });

    // Descuento = monto descontado configurado por el usuario
    const discountValInput = document.getElementById('sales-discount');
    let discount = parseFloat(discountValInput ? discountValInput.value : 0) || 0;

    if (discount < 0) {
      discount = 0;
      if (discountValInput) discountValInput.value = 0;
    }
    
    // El descuento no puede exceder al subtotal bruto
    if (discount > subtotal) {
      discount = subtotal;
      if (discountValInput) discountValInput.value = subtotal.toFixed(2);
    }

    // Base imponible = Subtotal - Descuento
    const baseImponible = subtotal - discount;

    // IGV = Base imponible x 0.18
    const igv = baseImponible * 0.18;

    // Total a pagar = Base imponible + IGV
    const total = baseImponible + igv;

    // Renderizar totales en la UI
    document.getElementById('summary-subtotal').textContent = `S/. ${subtotal.toFixed(2)}`;
    document.getElementById('summary-discount').textContent = `- S/. ${discount.toFixed(2)}`;
    document.getElementById('summary-base').textContent = `S/. ${baseImponible.toFixed(2)}`;
    document.getElementById('summary-igv').textContent = `S/. ${igv.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `S/. ${total.toFixed(2)}`;
  },

  // Búsqueda de cliente por DNI o RUC (RF-07)
  searchClient: function() {
    const docInput = document.getElementById('sales-client-doc').value.trim();
    const displayEl = document.getElementById('sales-client-display');
    const actionsEl = document.getElementById('sales-client-actions');
    
    this.selectedClient = null;
    actionsEl.classList.add('hidden');

    if (!docInput) {
      displayEl.innerHTML = "⚠️ Venta rápida (Sin cliente asociado)";
      return;
    }

    // Validar longitudes
    if (docInput.length !== 8 && docInput.length !== 11) {
      displayEl.innerHTML = "<span style='color: var(--danger-color);'>⚠️ Longitud incorrecta (DNI 8 dígitos, RUC 11 dígitos)</span>";
      actionsEl.classList.remove('hidden');
      
      // Configurar botón para registrar cliente rápido
      document.getElementById('btn-sales-client-register-fast').onclick = () => {
        this.openFastClientRegister(docInput);
      };
      return;
    }

    const client = this.clientsList.find(c => c.numero_documento === docInput);

    if (client) {
      if (client.estado !== 'Activo') {
        displayEl.innerHTML = "<span style='color: var(--danger-color);'>⚠️ Cliente registrado pero se encuentra Inactivo.</span>";
        return;
      }
      this.selectedClient = client;
      displayEl.innerHTML = `✅ Cliente: <strong>${client.nombres_razon_social}</strong> (${client.tipo_documento}: ${client.numero_documento})`;
    } else {
      displayEl.innerHTML = `<span style='color: var(--warning-color);'>⚠️ Cliente no registrado en base de datos.</span>`;
      actionsEl.classList.remove('hidden');
      
      document.getElementById('btn-sales-client-register-fast').onclick = () => {
        this.openFastClientRegister(docInput);
      };
    }
  },

  // Registro rápido de cliente desde ventas sin perder el carrito (UX excelente)
  openFastClientRegister: function(docValue) {
    const typeDoc = docValue.length === 11 ? 'RUC' : 'DNI';
    
    const formHtml = `
      <form id="fast-client-form">
        <div class="form-row">
          <div class="form-group">
            <label for="fast-cust-type">Tipo de Documento</label>
            <select id="fast-cust-type" required>
              <option value="DNI" ${typeDoc === 'DNI' ? 'selected' : ''}>DNI (Persona Natural)</option>
              <option value="RUC" ${typeDoc === 'RUC' ? 'selected' : ''}>RUC (Persona Jurídica)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="fast-cust-doc">Número de Documento</label>
            <input type="text" id="fast-cust-doc" value="${docValue}" maxlength="11" required>
          </div>
        </div>

        <div class="form-group">
          <label for="fast-cust-name">Nombres o Razón Social</label>
          <input type="text" id="fast-cust-name" placeholder="Ingrese nombre completo o Razón Social" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="fast-cust-phone">Teléfono</label>
            <input type="text" id="fast-cust-phone" placeholder="987654321">
          </div>
          <div class="form-group">
            <label for="fast-cust-address">Dirección</label>
            <input type="text" id="fast-cust-address" placeholder="Dirección del cliente">
          </div>
        </div>

        <div id="fast-client-error" class="error-msg hidden"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar y Asociar</button>
        </div>
      </form>
    `;

    App.showModal("Registro Rápido de Cliente", formHtml, (body) => {
      document.getElementById('fast-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorEl = document.getElementById('fast-client-error');
        errorEl.classList.add('hidden');

        const fastClient = {
          tipo_documento: document.getElementById('fast-cust-type').value,
          numero_documento: document.getElementById('fast-cust-doc').value.trim(),
          nombres_razon_social: document.getElementById('fast-cust-name').value.trim(),
          telefono: document.getElementById('fast-cust-phone').value.trim(),
          direccion: document.getElementById('fast-cust-address').value.trim(),
          estado: "Activo"
        };

        if (fastClient.tipo_documento === 'DNI' && !/^\d{8}$/.test(fastClient.numero_documento)) {
          errorEl.textContent = "El DNI debe contener exactamente 8 dígitos numéricos.";
          errorEl.classList.remove('hidden');
          return;
        }
        if (fastClient.tipo_documento === 'RUC' && !/^\d{11}$/.test(fastClient.numero_documento)) {
          errorEl.textContent = "El RUC debe contener exactamente 11 dígitos numéricos.";
          errorEl.classList.remove('hidden');
          return;
        }

        try {
          const registered = await App.fetchAPI('/api/customers', {
            method: 'POST',
            body: JSON.stringify(fastClient)
          });
          
          // Cerrar modal de registro rápido
          App.closeModal();
          
          // Actualizar lista de clientes en memoria y asociar de inmediato
          this.clientsList.push(registered);
          this.selectedClient = registered;
          document.getElementById('sales-client-doc').value = registered.numero_documento;
          document.getElementById('sales-client-display').innerHTML = `✅ Cliente: <strong>${registered.nombres_razon_social}</strong> (${registered.tipo_documento}: ${registered.numero_documento})`;
          document.getElementById('sales-client-actions').classList.add('hidden');

        } catch (fastErr) {
          errorEl.textContent = fastErr.message;
          errorEl.classList.remove('hidden');
        }
      });
    });
  },

  // Procesar cobro, guardar en base de datos y mostrar comprobante impreso (RF-06)
  processCheckout: async function() {
    const errorEl = document.getElementById('sales-checkout-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    // Validar carrito vacío
    if (this.cart.length === 0) {
      errorEl.textContent = "El carrito de compras se encuentra vacío. Añada productos antes de procesar.";
      errorEl.classList.remove('hidden');
      return;
    }

    // Validar tipo de comprobante vs cliente
    const receiptType = document.getElementById('sales-receipt-type').value;
    
    // Si es Factura, es OBLIGATORIO que el cliente tenga RUC
    if (receiptType === 'Factura') {
      if (!this.selectedClient) {
        errorEl.textContent = "Para emitir una Factura Interna, debe registrar y asociar obligatoriamente a un cliente con RUC.";
        errorEl.classList.remove('hidden');
        return;
      }
      if (this.selectedClient.tipo_documento !== 'RUC') {
        errorEl.textContent = "Las facturas solo pueden asociarse a clientes con RUC (Personas Jurídicas).";
        errorEl.classList.remove('hidden');
        return;
      }
    }

    // Si no hay cliente seleccionado, asociar a un cliente genérico por defecto ("CLIENTE VARIOS")
    let clienteId = this.selectedClient ? this.selectedClient.id : null;
    if (!clienteId) {
      // Intentar ubicar cliente genérico en la lista, sino usar el ID 1 o tirar alerta
      const generic = this.clientsList.find(c => c.numero_documento === '12345678');
      clienteId = generic ? generic.id : 1;
    }

    // Recuperar importes y aplicar desgloses
    let subtotal = 0;
    const detalles = this.cart.map(item => {
      const priceSub = item.cantidad * item.producto.precio;
      subtotal += priceSub;
      return {
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio
      };
    });

    const discount = parseFloat(document.getElementById('sales-discount').value) || 0;
    const baseImponible = subtotal - discount;
    const igv = baseImponible * 0.18;
    const total = baseImponible + igv;

    const salePayload = {
      cliente_id: clienteId,
      usuario_id: App.currentUser.id,
      tipo_comprobante: receiptType,
      subtotal: parseFloat(subtotal.toFixed(2)),
      descuento: parseFloat(discount.toFixed(2)),
      base_imponible: parseFloat(baseImponible.toFixed(2)),
      igv: parseFloat(igv.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      detalles: detalles
    };

    try {
      // Enviar transacción al servidor (El servidor resta stock y escribe logs en una transacción única)
      const completedSale = await App.fetchAPI('/api/sales', {
        method: 'POST',
        body: JSON.stringify(salePayload)
      });

      // Venta procesada con éxito.
      alert(`Venta registrada correctamente. Generando ${receiptType} interna local...`);
      
      // Mostrar la boleta/factura en el modal global para su impresión (RF-06)
      App.modules.billing.showInvoice(completedSale.id);

      // Reiniciar vista y limpiar carrito
      this.cart = [];
      this.selectedClient = null;
      document.getElementById('sales-client-doc').value = '';
      document.getElementById('sales-client-display').innerHTML = "⚠️ Venta rápida (Sin cliente asociado)";
      document.getElementById('sales-discount').value = 0;
      
      this.renderCart();
      this.updateTotals();
      
      // Recargar catálogo de stock disponible
      await this.loadData();

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
});
