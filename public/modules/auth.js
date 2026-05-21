/* ==========================================================================
   MÓDULO DE AUTENTICACIÓN (RF-01)
   ========================================================================== */

window.App.registerModule("auth", {
  // Lógica de Inicio de Sesión
  async login(usuario, password) {
    const result = await window.App.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario, password })
    });
    return result;
  },

  // Cierre de Sesión
  logout() {
    window.App.showLogin();
  }
});
