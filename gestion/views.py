from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db.models import F, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from .forms import (
    ClienteForm,
    MovimientoStockForm,
    ProductoForm,
    ProveedorForm,
    VentaForm,
)
from .models import Cliente, DetalleVenta, MovimientoStock, Producto, Proveedor, Venta
from .services import registrar_movimiento, registrar_venta


@login_required
def dashboard(request):
    ventas = Venta.objects.filter(estado=Venta.COMPLETADA)
    return render(
        request,
        "gestion/dashboard.html",
        {
            "productos": Producto.objects.count(),
            "clientes": Cliente.objects.count(),
            "stock_bajo": Producto.objects.filter(
                activo=True, stock__lte=F("stock_minimo")
            ).count(),
            "ingresos": ventas.aggregate(total=Sum("total"))["total"] or 0,
            "ultimas_ventas": ventas.select_related("cliente")[:5],
        },
    )


def _crud_lista(request, modelo, titulo, columnas, crear_url, editar_url):
    return render(
        request,
        "gestion/lista.html",
        {
            "titulo": titulo,
            "objetos": modelo.objects.all(),
            "columnas": columnas,
            "crear_url": crear_url,
            "editar_url": editar_url,
        },
    )


@login_required
def productos(request):
    return _crud_lista(
        request,
        Producto,
        "Productos",
        [
            ("codigo", "Código"),
            ("marca", "Marca"),
            ("modelo", "Modelo"),
            ("talla", "Talla"),
            ("precio", "Precio"),
            ("stock", "Stock"),
        ],
        "producto_crear",
        "producto_editar",
    )


@login_required
def clientes(request):
    return _crud_lista(
        request,
        Cliente,
        "Clientes",
        [
            ("numero_documento", "Documento"),
            ("nombres_razon_social", "Cliente"),
            ("telefono", "Teléfono"),
            ("direccion", "Dirección"),
        ],
        "cliente_crear",
        "cliente_editar",
    )


@login_required
def proveedores(request):
    return _crud_lista(
        request,
        Proveedor,
        "Proveedores",
        [
            ("ruc", "RUC"),
            ("razon_social", "Razón social"),
            ("telefono", "Teléfono"),
            ("direccion", "Dirección"),
        ],
        "proveedor_crear",
        "proveedor_editar",
    )


def _guardar_formulario(request, form_class, titulo, volver, instance=None):
    form = form_class(request.POST or None, instance=instance)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, f"{titulo} guardado correctamente.")
        return redirect(volver)
    return render(
        request,
        "gestion/formulario.html",
        {"form": form, "titulo": titulo, "volver": reverse(volver)},
    )


@login_required
def producto_form(request, pk=None):
    instance = get_object_or_404(Producto, pk=pk) if pk else None
    return _guardar_formulario(
        request, ProductoForm, "Producto", "productos", instance
    )


@login_required
def cliente_form(request, pk=None):
    instance = get_object_or_404(Cliente, pk=pk) if pk else None
    return _guardar_formulario(request, ClienteForm, "Cliente", "clientes", instance)


@login_required
def proveedor_form(request, pk=None):
    instance = get_object_or_404(Proveedor, pk=pk) if pk else None
    return _guardar_formulario(
        request, ProveedorForm, "Proveedor", "proveedores", instance
    )


@login_required
def inventario(request):
    form = MovimientoStockForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            registrar_movimiento(
                producto_id=form.cleaned_data["producto"].id,
                tipo=form.cleaned_data["tipo"],
                cantidad=form.cleaned_data["cantidad"],
                motivo=form.cleaned_data["motivo"],
                usuario=request.user,
            )
            messages.success(request, "Movimiento registrado correctamente.")
            return redirect("inventario")
        except ValidationError as error:
            form.add_error(None, error)
    return render(
        request,
        "gestion/inventario.html",
        {"form": form, "movimientos": MovimientoStock.objects.select_related("producto", "usuario")[:50]},
    )


@login_required
def ventas(request):
    form = VentaForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            venta = registrar_venta(
                cliente=form.cleaned_data["cliente"],
                producto_id=form.cleaned_data["producto"].id,
                cantidad=form.cleaned_data["cantidad"],
                tipo_comprobante=form.cleaned_data["tipo_comprobante"],
                usuario=request.user,
            )
            messages.success(request, f"Venta {venta} registrada correctamente.")
            return redirect("ventas")
        except ValidationError as error:
            form.add_error(None, error)
    return render(
        request,
        "gestion/ventas.html",
        {"form": form, "ventas": Venta.objects.select_related("cliente", "usuario")[:50]},
    )


@login_required
def reportes(request):
    top_productos = (
        DetalleVenta.objects.filter(venta__estado=Venta.COMPLETADA)
        .values("producto__codigo", "producto__marca", "producto__modelo")
        .annotate(unidades=Sum("cantidad"))
        .order_by("-unidades")[:5]
    )
    return render(
        request,
        "gestion/reportes.html",
        {
            "stock_bajo": Producto.objects.filter(
                activo=True, stock__lte=F("stock_minimo")
            ),
            "top_productos": top_productos,
            "total_ventas": Venta.objects.filter(estado=Venta.COMPLETADA).aggregate(
                total=Sum("total")
            )["total"]
            or 0,
        },
    )


@login_required
def api_productos(request):
    data = list(
        Producto.objects.filter(activo=True).values(
            "id", "codigo", "categoria", "marca", "modelo", "talla", "color", "precio", "stock"
        )
    )
    return JsonResponse({"resultados": data})


@login_required
def api_ventas(request):
    data = list(
        Venta.objects.select_related("cliente").values(
            "id",
            "cliente__nombres_razon_social",
            "tipo_comprobante",
            "serie",
            "numero",
            "total",
            "estado",
            "fecha",
        )[:100]
    )
    return JsonResponse({"resultados": data})
