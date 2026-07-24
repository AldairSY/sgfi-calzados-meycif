from functools import wraps

from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied

ADMINISTRADOR = "Administrador"
VENDEDOR = "Vendedor"
ALMACENERO = "Almacenero"


def tiene_rol(usuario, *roles):
    if not usuario.is_authenticated:
        return False
    if usuario.is_superuser:
        return True
    return usuario.groups.filter(name__in=roles).exists()


def roles_requeridos(*roles):
    def decorador(vista):
        @login_required
        @wraps(vista)
        def protegida(request, *args, **kwargs):
            if not tiene_rol(request.user, *roles):
                raise PermissionDenied
            return vista(request, *args, **kwargs)

        return protegida

    return decorador
