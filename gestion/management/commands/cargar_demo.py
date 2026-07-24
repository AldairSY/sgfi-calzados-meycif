from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from gestion.models import Cliente, Producto, Proveedor


class Command(BaseCommand):
    help = "Crea un usuario y datos de demostración para la exposición."

    def add_arguments(self, parser):
        parser.add_argument("--usuario", default="admin")
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        usuario, creado = get_user_model().objects.get_or_create(
            username=options["usuario"],
            defaults={"is_staff": True, "is_superuser": True},
        )
        usuario.is_staff = True
        usuario.is_superuser = True
        usuario.set_password(options["password"])
        usuario.save()

        Cliente.objects.get_or_create(
            numero_documento="12345678",
            defaults={
                "tipo_documento": Cliente.DNI,
                "nombres_razon_social": "Carlos Mendoza Torres",
                "telefono": "987654321",
                "direccion": "Miraflores, Lima",
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
        accion = "creado" if creado else "actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"Datos de demostración listos; usuario '{usuario.username}' {accion}."
            )
        )
