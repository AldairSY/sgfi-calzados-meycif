from django.contrib import admin

from .models import Cliente, DetalleVenta, MovimientoStock, Producto, Proveedor, Venta


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "marca", "modelo", "talla", "precio", "stock", "activo")
    search_fields = ("codigo", "marca", "modelo")
    list_filter = ("activo", "categoria", "marca")


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("numero_documento", "nombres_razon_social", "telefono", "activo")
    search_fields = ("numero_documento", "nombres_razon_social")


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ("ruc", "razon_social", "telefono", "activo")
    search_fields = ("ruc", "razon_social")


class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 0
    readonly_fields = ("producto", "cantidad", "precio_unitario", "subtotal")


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ("__str__", "cliente", "usuario", "total", "estado", "fecha")
    list_filter = ("estado", "tipo_comprobante")
    inlines = [DetalleVentaInline]


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = (
        "producto",
        "tipo",
        "cantidad",
        "stock_anterior",
        "stock_nuevo",
        "usuario",
        "fecha",
    )
    list_filter = ("tipo",)
