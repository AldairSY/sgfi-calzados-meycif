from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse

from .models import Cliente, MovimientoStock, Producto, Venta
from .permissions import ADMINISTRADOR, ALMACENERO, VENDEDOR
from .services import anular_venta, registrar_movimiento, registrar_venta


class GestionTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="admin", password="ClaveSegura2026!"
        )
        self.usuario.groups.add(Group.objects.create(name=ADMINISTRADOR))
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
            "usuarios",
            "auditoria",
            "api_productos",
            "api_ventas",
        ]
        for ruta in rutas:
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 200)

    def test_vendedor_solo_accede_a_modulos_comerciales(self):
        vendedor = get_user_model().objects.create_user("vendedor", password="test")
        vendedor.groups.add(Group.objects.create(name=VENDEDOR))
        self.client.force_login(vendedor)
        for ruta in ("dashboard", "productos", "clientes", "ventas", "api_ventas"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 200)
        for ruta in ("proveedores", "inventario", "reportes", "producto_crear"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 403)

    def test_almacenero_solo_accede_a_modulos_de_stock(self):
        almacenero = get_user_model().objects.create_user("almacenero", password="test")
        almacenero.groups.add(Group.objects.create(name=ALMACENERO))
        self.client.force_login(almacenero)
        for ruta in ("dashboard", "productos", "proveedores", "inventario"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 200)
        for ruta in ("clientes", "ventas", "reportes", "api_ventas"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.client.get(reverse(ruta)).status_code, 403)

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
            items=[{"producto": self.producto, "cantidad": 2}],
            tipo_comprobante=Venta.BOLETA,
            usuario=self.usuario,
        )
        self.producto.refresh_from_db()
        self.assertEqual(venta.subtotal, Decimal("200.00"))
        self.assertEqual(venta.total, Decimal("236.00"))
        self.assertEqual(self.producto.stock, 8)

    def test_anulacion_restaura_stock(self):
        venta = registrar_venta(
            cliente=self.cliente,
            items=[{"producto": self.producto, "cantidad": 3}],
            tipo_comprobante=Venta.FACTURA,
            usuario=self.usuario,
        )
        anular_venta(venta_id=venta.id, motivo="Error de digitación", usuario=self.usuario)
        venta.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(venta.estado, Venta.ANULADA)
        self.assertEqual(self.producto.stock, 10)

    def test_formulario_registra_venta_y_muestra_comprobante(self):
        self.client.force_login(self.usuario)
        respuesta = self.client.post(
            reverse("ventas"),
            {
                "cliente": self.cliente.id,
                "tipo_comprobante": Venta.BOLETA,
                "detalles-TOTAL_FORMS": "3",
                "detalles-INITIAL_FORMS": "0",
                "detalles-MIN_NUM_FORMS": "1",
                "detalles-MAX_NUM_FORMS": "1000",
                "detalles-0-producto": self.producto.id,
                "detalles-0-cantidad": "2",
                "detalles-1-producto": "",
                "detalles-1-cantidad": "",
                "detalles-2-producto": "",
                "detalles-2-cantidad": "",
            },
        )
        venta = Venta.objects.get()
        self.assertRedirects(respuesta, reverse("comprobante", args=[venta.pk]))
        self.assertContains(self.client.get(respuesta.url), "B001-00000001")

    def test_administrador_puede_abrir_cambio_de_clave(self):
        self.client.force_login(self.usuario)
        respuesta = self.client.get(
            reverse("usuario_password", args=[self.usuario.pk])
        )
        self.assertEqual(respuesta.status_code, 200)
