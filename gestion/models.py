from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models


class EstadoModel(models.Model):
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Cliente(EstadoModel):
    DNI = "DNI"
    RUC = "RUC"
    DOCUMENTOS = [(DNI, "DNI"), (RUC, "RUC")]

    tipo_documento = models.CharField(max_length=3, choices=DOCUMENTOS)
    numero_documento = models.CharField(
        max_length=11,
        unique=True,
        validators=[RegexValidator(r"^\d{8}(\d{3})?$", "Ingrese un DNI o RUC válido.")],
    )
    nombres_razon_social = models.CharField(max_length=150)
    telefono = models.CharField(max_length=15, blank=True)
    direccion = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["nombres_razon_social"]

    def __str__(self):
        return f"{self.numero_documento} - {self.nombres_razon_social}"


class Proveedor(EstadoModel):
    razon_social = models.CharField(max_length=150)
    ruc = models.CharField(
        max_length=11,
        unique=True,
        validators=[RegexValidator(r"^\d{11}$", "El RUC debe tener 11 dígitos.")],
    )
    telefono = models.CharField(max_length=15, blank=True)
    direccion = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return self.razon_social


class Producto(EstadoModel):
    codigo = models.CharField(max_length=30, unique=True)
    categoria = models.CharField(max_length=60)
    marca = models.CharField(max_length=60)
    modelo = models.CharField(max_length=100)
    talla = models.CharField(max_length=10)
    color = models.CharField(max_length=40)
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["marca", "modelo", "talla"]

    @property
    def stock_bajo(self):
        return self.stock <= self.stock_minimo

    def __str__(self):
        return f"{self.codigo} - {self.marca} {self.modelo} (Talla {self.talla})"


class MovimientoStock(models.Model):
    INGRESO = "INGRESO"
    SALIDA = "SALIDA"
    TIPOS = [(INGRESO, "Ingreso"), (SALIDA, "Salida")]

    producto = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name="movimientos"
    )
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    tipo = models.CharField(max_length=7, choices=TIPOS)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    stock_anterior = models.PositiveIntegerField()
    stock_nuevo = models.PositiveIntegerField()
    motivo = models.CharField(max_length=150)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]


class Venta(models.Model):
    BOLETA = "BOLETA"
    FACTURA = "FACTURA"
    COMPROBANTES = [(BOLETA, "Boleta"), (FACTURA, "Factura")]
    COMPLETADA = "COMPLETADA"
    ANULADA = "ANULADA"
    ESTADOS = [(COMPLETADA, "Completada"), (ANULADA, "Anulada")]

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="ventas")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    tipo_comprobante = models.CharField(max_length=7, choices=COMPROBANTES)
    serie = models.CharField(max_length=4)
    numero = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    igv = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.CharField(max_length=10, choices=ESTADOS, default=COMPLETADA)
    fecha = models.DateTimeField(auto_now_add=True)
    fecha_anulacion = models.DateTimeField(null=True, blank=True)
    motivo_anulacion = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-fecha"]
        constraints = [
            models.UniqueConstraint(
                fields=["tipo_comprobante", "serie", "numero"],
                name="comprobante_correlativo_unico",
            )
        ]

    def __str__(self):
        return f"{self.serie}-{self.numero:08d}"


class DetalleVenta(models.Model):
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["venta", "producto"], name="producto_unico_por_venta"
            )
        ]


class Auditoria(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="auditorias"
    )
    modulo = models.CharField(max_length=50)
    accion = models.CharField(max_length=80)
    descripcion = models.CharField(max_length=250)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.fecha:%d/%m/%Y %H:%M} - {self.accion}"
