/* ==========================================================================
   MÓDULO: COMPROBANTES DE FACTURACIÓN INTERNA E IMPRESIÓN (RF-06)
   ========================================================================== */

window.App.registerModule("billing", {
  // Cargar una venta, calcular desgloses y mostrarla en un modal imprimible
  showInvoice: async function(saleId) {
    try {
      // Cargar datos asíncronamente para resolver relaciones referenciales
      const sales = await App.fetchAPI('/api/sales');
      const sale = sales.find(s => s.id === parseInt(saleId));
      if (!sale) throw new Error("Venta no encontrada.");

      const details = await App.fetchAPI(`/api/sales/${saleId}/details`);
      const products = await App.fetchAPI('/api/products');
      const customers = await App.fetchAPI('/api/customers');
      const users = await App.fetchAPI('/api/users').catch(() => []); // Admin fallback

      const client = customers.find(c => c.id === sale.cliente_id);
      const user = users.find(u => u.id === sale.usuario_id);

      // Formatear correlativo local elegante
      const correlative = String(sale.id).padStart(6, '0');
      const docName = sale.tipo_comprobante === 'Boleta' ? 'BOLETA DE VENTA INTERNA' : 'FACTURA INTERNA';

      const formattedDate = new Date(sale.fecha_venta).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

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
            <td style="text-align: right;">S/. ${d.precio_unitario.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">S/. ${d.subtotal.toFixed(2)}</td>
          </tr>
        `;
      });

      const invoiceHtml = `
        <div class="invoice-box" id="printable-invoice">
          <div class="invoice-header">
            <h1>CALZADOS MEYCIF S.A.C.</h1>
            <p>RUC de Control: 20601020304</p>
            <p>Dirección: Jr. Junín 1025, Cercado de Lima</p>
            <p>Teléfono: (01) 425-6374 | Celular: 999 888 777</p>
            <h2 style="margin-top: 15px; font-size: 16px; font-weight: bold; text-decoration: underline;">
              ${docName} Nº MEY-${correlative}
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
              <span>S/. ${sale.subtotal.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row" style="color: red;">
              <span>Descuento aplicado:</span>
              <span>- S/. ${sale.descuento.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row" style="font-weight: bold;">
              <span>Base Imponible:</span>
              <span>S/. ${sale.base_imponible.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row">
              <span>IGV (18.00%):</span>
              <span>S/. ${sale.igv.toFixed(2)}</span>
            </div>
            <div class="invoice-totals-row total">
              <span>Total Neto a Pagar:</span>
              <span>S/. ${sale.total.toFixed(2)}</span>
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
