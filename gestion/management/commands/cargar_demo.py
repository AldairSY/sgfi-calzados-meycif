from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from gestion.models import Cliente, Producto, Proveedor
from gestion.permissions import ADMINISTRADOR, ALMACENERO, VENDEDOR


class Command(BaseCommand):
    help = "Crea un usuario y datos de demostración para la exposición."

    def add_arguments(self, parser):
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        grupos = {
            nombre: Group.objects.get_or_create(name=nombre)[0]
            for nombre in (ADMINISTRADOR, VENDEDOR, ALMACENERO)
        }
        cuentas = [
            ("admin", ADMINISTRADOR, True),
            ("vendedor", VENDEDOR, False),
            ("almacenero", ALMACENERO, False),
        ]
        for username, rol, es_admin in cuentas:
            usuario, _ = get_user_model().objects.get_or_create(username=username)
            usuario.is_staff = es_admin
            usuario.is_superuser = es_admin
            usuario.is_active = True
            usuario.set_password(options["password"])
            usuario.save()
            usuario.groups.set([grupos[rol]])

        clientes = [
            ("12345678", "Carlos Mendoza Torres", "987654321", "Miraflores, Lima"),
            ("70000001", "Ana López Quispe", "900000001", "El Tambo, Huancayo"),
            ("70000002", "Luis Ramos Castro", "900000002", "Chilca, Huancayo"),
            ("70000003", "María Huamán Soto", "900000003", "San Carlos, Huancayo"),
            ("70000004", "José Paredes Rojas", "900000004", "Pilcomayo, Huancayo"),
            ("70000005", "Rosa Flores Díaz", "900000005", "Sapallanga, Huancayo"),
            ("70000006", "Miguel Torres Vega", "900000006", "Concepción, Junín"),
            ("70000007", "Carmen Salazar Peña", "900000007", "Jauja, Junín"),
            ("70000008", "Diego Chávez León", "900000008", "La Oroya, Junín"),
            ("70000009", "Patricia Ríos Meza", "900000009", "Tarma, Junín"),
            ("70000010", "Jorge Espinoza Ruiz", "900000010", "Chupaca, Junín"),
        ]
        for documento, nombre, telefono, direccion in clientes:
            Cliente.objects.get_or_create(
                numero_documento=documento,
                defaults={
                    "tipo_documento": Cliente.DNI,
                    "nombres_razon_social": nombre,
                    "telefono": telefono,
                    "direccion": direccion,
                },
            )
        Proveedor.objects.get_or_create(
            ruc="20556677881",
            defaults={
                "razon_social": "Calzado Mayorista S.A.C.",
                "telefono": "999888777",
                "direccion": "Villa El Salvador, Lima",
            },
        )
        productos = [
            ("MEY-001", "Urbano", "Meycif", "Classic", "38", "Blanco", "149.90", 12, 3),
            ("MEY-002", "Deportivo", "Meycif", "Runner", "40", "Negro", "189.90", 2, 5),
            ("MEY-003", "Formal", "Meycif", "Oxford", "41", "Marrón", "219.90", 8, 3),
        ]
        for codigo, categoria, marca, modelo, talla, color, precio, stock, minimo in productos:
            Producto.objects.get_or_create(
                codigo=codigo,
                defaults={
                    "categoria": categoria,
                    "marca": marca,
                    "modelo": modelo,
                    "talla": talla,
                    "color": color,
                    "precio": Decimal(precio),
                    "stock": stock,
                    "stock_minimo": minimo,
                },
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Datos listos: 3 usuarios, 11 clientes, 3 productos y 1 proveedor."
            )
        )
