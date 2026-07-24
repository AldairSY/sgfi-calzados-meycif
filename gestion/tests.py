from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse

from .models import Cliente, MovimientoStock, Producto, Venta
from .services import registrar_movimiento, registrar_venta


class GestionTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="admin", password="ClaveSegura2026!"
        )
        self.cliente = Cliente.objects.create(
            tipo_documento="DNI",
            numero_documento="12345678",
            nombres_razon_social="Cliente Prueba",
        )
        self.producto = Producto.objects.create(
            codigo="TEST-001",
            categoria="Urbano",
            marca="Meycif",
            modelo="Prueba",
            talla="40",
            color="Negro",
            precio=Decimal("100.00"),
            stock=10,
            stock_minimo=2,
        )

    def test_rutas_requieren_autenticacion(self):
        respuesta = self.client.get(reverse("productos"))
        self.assertEqual(respuesta.status_code, 302)
        self.assertIn("/login/", respuesta.url)

    def test_modulos_y_api_renderizan_autenticados(self):
        self.client.force_login(self.usuario)
        rutas = [
            "dashboard",
            "productos",
            "clientes",
            "proveedores",
            "inventario",
            "ventas",
            "reportes",
            "api_productos",
            "api_ventas",
        ]
        for ruta in rutas:
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 200)

    def test_movimiento_actualiza_stock(self):
        registrar_movimiento(
            producto_id=self.producto.id,
            tipo=MovimientoStock.INGRESO,
            cantidad=5,
            motivo="Compra",
            usuario=self.usuario,
        )
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 15)

    def test_no_permite_salida_sin_stock(self):
        with self.assertRaises(ValidationError):
            registrar_movimiento(
                producto_id=self.producto.id,
                tipo=MovimientoStock.SALIDA,
                cantidad=11,
                motivo="Ajuste",
                usuario=self.usuario,
            )

    def test_venta_calcula_total_y_reduce_stock(self):
        venta = registrar_venta(
            cliente=self.cliente,
            producto_id=self.producto.id,
            cantidad=2,
            tipo_comprobante=Venta.BOLETA,
            usuario=self.usuario,
        )
        self.producto.refresh_from_db()
        self.assertEqual(venta.subtotal, Decimal("200.00"))
        self.assertEqual(venta.total, Decimal("236.00"))
        self.assertEqual(self.producto.stock, 8)
