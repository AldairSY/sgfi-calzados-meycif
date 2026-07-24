from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("productos/", views.productos, name="productos"),
    path("productos/nuevo/", views.producto_form, name="producto_crear"),
    path("productos/<int:pk>/editar/", views.producto_form, name="producto_editar"),
    path("clientes/", views.clientes, name="clientes"),
    path("clientes/nuevo/", views.cliente_form, name="cliente_crear"),
    path("clientes/<int:pk>/editar/", views.cliente_form, name="cliente_editar"),
    path("proveedores/", views.proveedores, name="proveedores"),
    path("proveedores/nuevo/", views.proveedor_form, name="proveedor_crear"),
    path("proveedores/<int:pk>/editar/", views.proveedor_form, name="proveedor_editar"),
    path("inventario/", views.inventario, name="inventario"),
    path("ventas/", views.ventas, name="ventas"),
    path("ventas/<int:pk>/comprobante/", views.comprobante, name="comprobante"),
    path("ventas/<int:pk>/anular/", views.venta_anular, name="venta_anular"),
    path("reportes/", views.reportes, name="reportes"),
    path("reportes/ventas.csv", views.exportar_ventas_csv, name="exportar_ventas_csv"),
    path("usuarios/", views.usuarios, name="usuarios"),
    path("usuarios/nuevo/", views.usuario_crear, name="usuario_crear"),
    path("usuarios/<int:pk>/editar/", views.usuario_editar, name="usuario_editar"),
    path("usuarios/<int:pk>/password/", views.usuario_password, name="usuario_password"),
    path("auditoria/", views.auditoria, name="auditoria"),
    path("api/productos/", views.api_productos, name="api_productos"),
    path("api/ventas/", views.api_ventas, name="api_ventas"),
]
