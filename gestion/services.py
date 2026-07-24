from abc import ABC, abstractmethod
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max

from .models import DetalleVenta, MovimientoStock, Producto, Venta


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
def registrar_movimiento(*, producto_id, tipo, cantidad, motivo, usuario):
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
    return MovimientoStock.objects.create(
        producto=producto,
        usuario=usuario,
        tipo=tipo,
        cantidad=cantidad,
        stock_anterior=anterior,
        stock_nuevo=producto.stock,
        motivo=motivo,
    )


@transaction.atomic
def registrar_venta(*, cliente, producto_id, cantidad, tipo_comprobante, usuario):
    producto = Producto.objects.select_for_update().get(pk=producto_id, activo=True)
    if cantidad > producto.stock:
        raise ValidationError("Stock insuficiente para completar la venta.")

    subtotal = producto.precio * cantidad
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
    DetalleVenta.objects.create(
        venta=venta,
        producto=producto,
        cantidad=cantidad,
        precio_unitario=producto.precio,
        subtotal=subtotal,
    )
    registrar_movimiento(
        producto_id=producto.id,
        tipo=MovimientoStock.SALIDA,
        cantidad=cantidad,
        motivo=f"Venta {venta}",
        usuario=usuario,
    )
    return venta
