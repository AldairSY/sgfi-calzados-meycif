/* ==========================================================================
   MÓDULO: RESPALDOS DE BASE DE DATOS (EXCLUSIVO ADMINISTRADOR) (RF-12)
   ========================================================================== */

window.App.registerModule("backup", {
  backupList: [],

  render: async function(container) {
    let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
        <!-- Panel Izquierdo: Ejecución de Respaldo -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 class="card-title">Generar Copia de Seguridad</h3>
            <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 15px;">
              Crear un respaldo físico de la base de datos SQLite actual (<code>meycif.db</code>).
            </p>
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
              • Los archivos generados se guardarán con la marca de tiempo en la carpeta interna <code>/backups</code> en el servidor.<br>
              • Se registrará el usuario responsable y la fecha/hora exacta del respaldo de seguridad en la bitácora.<br>
              • Utilice estos archivos para restablecer la información del sistema en caso de pérdida accidental.
            </p>
          </div>
          <button class="btn btn-primary btn-block" id="btn-run-backup" style="padding: 12px; font-weight: 600; font-size: 15px;">
            💾 Ejecutar Respaldo de Base de Datos
          </button>
        </div>

        <!-- Panel Derecho: Estado de Seguridad -->
        <div class="card" style="background-color: rgba(197, 168, 128, 0.03); border-color: var(--accent-color);">
          <h3 class="card-title" style="color: var(--primary-color);">Garantía de Datos</h3>
          <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6;">
            <p style="margin-bottom: 10px;"><strong>Recomendación Operacional:</strong></p>
            <p style="margin-bottom: 8px;">1. Realice al menos un respaldo al finalizar cada jornada comercial.</p>
            <p style="margin-bottom: 8px;">2. Verifique la ruta del archivo físico para guardarlo en un dispositivo externo de almacenamiento o en la nube.</p>
            <p style="margin-bottom: 8px;">3. La base de datos contiene todo el historial de ventas, clientes, calzados e inventario de Calzados Meycif.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Historial de Respaldos de Base de Datos</h3>
        <div class="table-responsive" id="backup-table-container">
          <div class="loading-spinner">Cargando bitácora de copias de seguridad...</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Cargar bitácora
    await this.loadAndRenderTable();

    // Eventos
    document.getElementById('btn-run-backup').addEventListener('click', () => this.executeBackup());
  },

  // Cargar lista de backups desde API
  loadAndRenderTable: async function() {
    try {
      this.backupList = await App.fetchAPI('/api/backups');
      this.renderTable();
    } catch (err) {
      console.error("Error al cargar historial de backups:", err);
      document.getElementById('backup-table-container').innerHTML = `
        <div class="error-msg">Error al cargar bitácora: ${err.message}</div>
      `;
    }
  },

  // Renderizar tabla
  renderTable: function() {
    const container = document.getElementById('backup-table-container');
    if (this.backupList.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No se registran respaldos previos creados.</div>`;
      return;
    }

    let tableHtml = `
      <table class="custom-table" style="font-size: 13px;">
        <thead>
          <tr>
            <th>Nombre del Archivo Backup</th>
            <th>Ruta Física Local</th>
            <th style="width: 160px;">Fecha y Hora</th>
            <th>Generado Por</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.backupList.forEach(b => {
      const dateStr = new Date(b.fecha_backup).toLocaleString('es-PE');
      
      tableHtml += `
        <tr>
          <td><strong>${b.nombre_archivo}</strong></td>
          <td><code style="word-break: break-all;">${b.ruta_archivo}</code></td>
          <td>${dateStr}</td>
          <td><strong>${b.usuario_nombre || 'Usuario Desconocido'}</strong></td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  },

  // Ejecutar copia de seguridad
  executeBackup: async function() {
    const btn = document.getElementById('btn-run-backup');
    btn.disabled = true;
    btn.textContent = "💾 Procesando Copia...";
    
    try {
      await App.fetchAPI('/api/backups', { method: 'POST' });
      alert("Copia de seguridad física generada y registrada con éxito.");
      await this.loadAndRenderTable();
    } catch (err) {
      alert("Error al generar copia de seguridad: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "💾 Ejecutar Respaldo de Base de Datos";
    }
  }
});
