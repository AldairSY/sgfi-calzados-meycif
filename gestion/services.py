from abc import ABC, abstractmethod
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import Auditoria, DetalleVenta, MovimientoStock, Producto, Venta


class ComprobanteStrategy(ABC):
    @abstractmethod
    def serie(self):
        raise NotImplementedError


class BoletaStrategy(ComprobanteStrategy):
    def serie(self):
        return "B001"


class FacturaStrategy(ComprobanteStrategy):
    def serie(self):
        return "F001"


class ComprobanteFactory:
    @staticmethod
    def crear(tipo):
        estrategias = {
            Venta.BOLETA: BoletaStrategy,
            Venta.FACTURA: FacturaStrategy,
        }
        try:
            return estrategias[tipo]()
        except KeyError as exc:
            raise ValidationError("Tipo de comprobante inválido.") from exc


@transaction.atomic
def registrar_auditoria(usuario, modulo, accion, descripcion):
    return Auditoria.objects.create(
        usuario=usuario,
        modulo=modulo,
        accion=accion,
        descripcion=descripcion,
    )


def registrar_movimiento(*, producto_id, tipo, cantidad, motivo, usuario, auditar=True):
    producto = Producto.objects.select_for_update().get(pk=producto_id, activo=True)
    anterior = producto.stock
    if tipo == MovimientoStock.SALIDA:
        if cantidad > anterior:
            raise ValidationError("Stock insuficiente para registrar la salida.")
        producto.stock -= cantidad
    elif tipo == MovimientoStock.INGRESO:
        producto.stock += cantidad
    else:
        raise ValidationError("Tipo de movimiento inválido.")
    producto.save(update_fields=["stock", "actualizado"])
    movimiento = MovimientoStock.objects.create(
        producto=producto,
        usuario=usuario,
        tipo=tipo,
        cantidad=cantidad,
        stock_anterior=anterior,
        stock_nuevo=producto.stock,
        motivo=motivo,
    )
    if auditar:
        registrar_auditoria(
            usuario,
            "Inventario",
            f"{tipo.title()} de stock",
            f"{producto.codigo}: {cantidad} unidades ({anterior} → {producto.stock}).",
        )
    return movimiento


@transaction.atomic
def registrar_venta(*, cliente, items, tipo_comprobante, usuario):
    cantidades = {}
    for item in items:
        producto_id = item["producto"].id
        cantidades[producto_id] = cantidades.get(producto_id, 0) + item["cantidad"]
    productos = {
        producto.id: producto
        for producto in Producto.objects.select_for_update().filter(
            id__in=cantidades, activo=True
        )
    }
    if len(productos) != len(cantidades):
        raise ValidationError("Uno de los productos no está disponible.")
    for producto_id, cantidad in cantidades.items():
        if cantidad > productos[producto_id].stock:
            raise ValidationError(
                f"Stock insuficiente para {productos[producto_id].codigo}."
            )

    subtotal = sum(
        (productos[producto_id].precio * cantidad for producto_id, cantidad in cantidades.items()),
        Decimal("0.00"),
    )
    igv = (subtotal * Decimal("0.18")).quantize(Decimal("0.01"))
    total = subtotal + igv
    serie = ComprobanteFactory.crear(tipo_comprobante).serie()
    ultimo = (
        Venta.objects.filter(tipo_comprobante=tipo_comprobante, serie=serie)
        .aggregate(maximo=Max("numero"))["maximo"]
        or 0
    )
    venta = Venta.objects.create(
        cliente=cliente,
        usuario=usuario,
        tipo_comprobante=tipo_comprobante,
        serie=serie,
        numero=ultimo + 1,
        subtotal=subtotal,
        igv=igv,
        total=total,
    )
    for producto_id, cantidad in cantidades.items():
        producto = productos[producto_id]
        DetalleVenta.objects.create(
            venta=venta,
            producto=producto,
            cantidad=cantidad,
            precio_unitario=producto.precio,
            subtotal=producto.precio * cantidad,
        )
        registrar_movimiento(
            producto_id=producto.id,
            tipo=MovimientoStock.SALIDA,
            cantidad=cantidad,
            motivo=f"Venta {venta}",
            usuario=usuario,
            auditar=False,
        )
    registrar_auditoria(
        usuario,
        "Ventas",
        "Registrar venta",
        f"{venta} por S/ {venta.total} con {sum(cantidades.values())} unidades.",
    )
    return venta


@transaction.atomic
def anular_venta(*, venta_id, motivo, usuario):
    venta = (
        Venta.objects.select_for_update()
        .prefetch_related("detalles__producto")
        .get(pk=venta_id)
    )
    if venta.estado == Venta.ANULADA:
        raise ValidationError("La venta ya se encuentra anulada.")
    for detalle in venta.detalles.all():
        registrar_movimiento(
            producto_id=detalle.producto_id,
            tipo=MovimientoStock.INGRESO,
            cantidad=detalle.cantidad,
            motivo=f"Anulación de {venta}",
            usuario=usuario,
            auditar=False,
        )
    venta.estado = Venta.ANULADA
    venta.fecha_anulacion = timezone.now()
    venta.motivo_anulacion = motivo
    venta.save(update_fields=["estado", "fecha_anulacion", "motivo_anulacion"])
    registrar_auditoria(
        usuario, "Ventas", "Anular venta", f"{venta}. Motivo: {motivo}"
    )
    return venta
