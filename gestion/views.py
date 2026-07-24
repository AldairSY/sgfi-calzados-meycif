import csv

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db.models import F, Q, Sum
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from .forms import (
    AnulacionForm,
    ClienteForm,
    DetalleVentaFormSet,
    MovimientoStockForm,
    ProductoForm,
    ProveedorForm,
    UsuarioEditarForm,
    UsuarioForm,
    UsuarioPasswordForm,
    VentaForm,
)
from .models import Auditoria, Cliente, DetalleVenta, MovimientoStock, Producto, Proveedor, Venta
from .permissions import (
    ADMINISTRADOR,
    ALMACENERO,
    VENDEDOR,
    roles_requeridos,
)
from .services import (
    anular_venta,
    registrar_auditoria,
    registrar_movimiento,
    registrar_venta,
)


@roles_requeridos(ADMINISTRADOR, ALMACENERO, VENDEDOR)
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


def _crud_lista(request, modelo, titulo, columnas, crear_url, editar_url, campos_busqueda):
    objetos = modelo.objects.all()
    busqueda = request.GET.get("q", "").strip()
    if busqueda:
        filtro = Q()
        for campo in campos_busqueda:
            filtro |= Q(**{f"{campo}__icontains": busqueda})
        objetos = objetos.filter(filtro)
    return render(
        request,
        "gestion/lista.html",
        {
            "titulo": titulo,
            "objetos": objetos,
            "busqueda": busqueda,
            "columnas": columnas,
            "crear_url": crear_url,
            "editar_url": editar_url,
        },
    )


@roles_requeridos(ADMINISTRADOR, ALMACENERO, VENDEDOR)
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
        ["codigo", "marca", "modelo", "categoria"],
    )


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
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
        ["numero_documento", "nombres_razon_social"],
    )


@roles_requeridos(ADMINISTRADOR, ALMACENERO)
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
        ["ruc", "razon_social"],
    )


def _guardar_formulario(request, form_class, titulo, volver, instance=None):
    form = form_class(request.POST or None, instance=instance)
    if request.method == "POST" and form.is_valid():
        objeto = form.save()
        registrar_auditoria(
            request.user,
            titulo,
            "Editar" if instance else "Crear",
            str(objeto),
        )
        messages.success(request, f"{titulo} guardado correctamente.")
        return redirect(volver)
    return render(
        request,
        "gestion/formulario.html",
        {"form": form, "titulo": titulo, "volver": reverse(volver)},
    )


@roles_requeridos(ADMINISTRADOR, ALMACENERO)
def producto_form(request, pk=None):
    instance = get_object_or_404(Producto, pk=pk) if pk else None
    return _guardar_formulario(
        request, ProductoForm, "Producto", "productos", instance
    )


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
def cliente_form(request, pk=None):
    instance = get_object_or_404(Cliente, pk=pk) if pk else None
    return _guardar_formulario(request, ClienteForm, "Cliente", "clientes", instance)


@roles_requeridos(ADMINISTRADOR, ALMACENERO)
def proveedor_form(request, pk=None):
    instance = get_object_or_404(Proveedor, pk=pk) if pk else None
    return _guardar_formulario(
        request, ProveedorForm, "Proveedor", "proveedores", instance
    )


@roles_requeridos(ADMINISTRADOR, ALMACENERO)
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


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
def ventas(request):
    form = VentaForm(request.POST or None)
    detalles = DetalleVentaFormSet(request.POST or None, prefix="detalles")
    if request.method == "POST" and form.is_valid() and detalles.is_valid():
        try:
            venta = registrar_venta(
                cliente=form.cleaned_data["cliente"],
                items=[
                    fila
                    for fila in detalles.cleaned_data
                    if fila and fila.get("producto") and fila.get("cantidad")
                ],
                tipo_comprobante=form.cleaned_data["tipo_comprobante"],
                usuario=request.user,
            )
            messages.success(request, f"Venta {venta} registrada correctamente.")
            return redirect("comprobante", pk=venta.pk)
        except ValidationError as error:
            form.add_error(None, error)
    return render(
        request,
        "gestion/ventas.html",
        {
            "form": form,
            "detalles": detalles,
            "ventas": Venta.objects.select_related("cliente", "usuario")[:50],
        },
    )


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
def comprobante(request, pk):
    venta = get_object_or_404(
        Venta.objects.select_related("cliente", "usuario").prefetch_related(
            "detalles__producto"
        ),
        pk=pk,
    )
    return render(request, "gestion/comprobante.html", {"venta": venta})


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
def venta_anular(request, pk):
    venta = get_object_or_404(Venta, pk=pk)
    form = AnulacionForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            anular_venta(
                venta_id=venta.pk,
                motivo=form.cleaned_data["motivo"],
                usuario=request.user,
            )
            messages.success(request, f"Venta {venta} anulada; el stock fue restaurado.")
            return redirect("ventas")
        except ValidationError as error:
            form.add_error(None, error)
    return render(
        request,
        "gestion/formulario.html",
        {
            "form": form,
            "titulo": f"Anular {venta}",
            "volver": reverse("comprobante", args=[venta.pk]),
        },
    )


@roles_requeridos(ADMINISTRADOR)
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


@roles_requeridos(ADMINISTRADOR)
def exportar_ventas_csv(request):
    respuesta = HttpResponse(content_type="text/csv; charset=utf-8")
    respuesta["Content-Disposition"] = 'attachment; filename="ventas_meycif.csv"'
    respuesta.write("\ufeff")
    writer = csv.writer(respuesta)
    writer.writerow(["Comprobante", "Cliente", "Total", "Estado", "Fecha"])
    for venta in Venta.objects.select_related("cliente"):
        writer.writerow(
            [
                str(venta),
                venta.cliente.nombres_razon_social,
                venta.total,
                venta.get_estado_display(),
                venta.fecha.strftime("%d/%m/%Y %H:%M"),
            ]
        )
    return respuesta


@roles_requeridos(ADMINISTRADOR)
def usuarios(request):
    return render(
        request,
        "gestion/usuarios.html",
        {"usuarios": get_user_model().objects.prefetch_related("groups").order_by("username")},
    )


def _asignar_rol(usuario, rol):
    grupo, _ = Group.objects.get_or_create(name=rol)
    usuario.groups.set([grupo])
    usuario.is_superuser = rol == ADMINISTRADOR
    usuario.is_staff = rol == ADMINISTRADOR
    usuario.save()


@roles_requeridos(ADMINISTRADOR)
def usuario_crear(request):
    form = UsuarioForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        usuario = form.save()
        _asignar_rol(usuario, form.cleaned_data["rol"])
        registrar_auditoria(request.user, "Usuarios", "Crear usuario", usuario.username)
        messages.success(request, "Usuario creado correctamente.")
        return redirect("usuarios")
    return render(
        request,
        "gestion/formulario.html",
        {"form": form, "titulo": "Nuevo usuario", "volver": reverse("usuarios")},
    )


@roles_requeridos(ADMINISTRADOR)
def usuario_editar(request, pk):
    usuario = get_object_or_404(get_user_model(), pk=pk)
    form = UsuarioEditarForm(request.POST or None, instance=usuario)
    if request.method == "POST" and form.is_valid():
        usuario = form.save()
        _asignar_rol(usuario, form.cleaned_data["rol"])
        registrar_auditoria(request.user, "Usuarios", "Editar usuario", usuario.username)
        messages.success(request, "Usuario actualizado correctamente.")
        return redirect("usuarios")
    return render(
        request,
        "gestion/formulario.html",
        {"form": form, "titulo": "Editar usuario", "volver": reverse("usuarios")},
    )


@roles_requeridos(ADMINISTRADOR)
def usuario_password(request, pk):
    usuario = get_object_or_404(get_user_model(), pk=pk)
    form = UsuarioPasswordForm(usuario, request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        registrar_auditoria(
            request.user, "Usuarios", "Cambiar contraseña", usuario.username
        )
        messages.success(request, "Contraseña actualizada correctamente.")
        return redirect("usuarios")
    return render(
        request,
        "gestion/formulario.html",
        {
            "form": form,
            "titulo": f"Cambiar contraseña de {usuario.username}",
            "volver": reverse("usuarios"),
        },
    )


@roles_requeridos(ADMINISTRADOR)
def auditoria(request):
    return render(
        request,
        "gestion/auditoria.html",
        {"registros": Auditoria.objects.select_related("usuario")[:200]},
    )


@roles_requeridos(ADMINISTRADOR, ALMACENERO, VENDEDOR)
def api_productos(request):
    data = list(
        Producto.objects.filter(activo=True).values(
            "id", "codigo", "categoria", "marca", "modelo", "talla", "color", "precio", "stock"
        )
    )
    return JsonResponse({"resultados": data})


@roles_requeridos(ADMINISTRADOR, VENDEDOR)
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
