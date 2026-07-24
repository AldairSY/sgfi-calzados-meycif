from django import template

register = template.Library()


@register.filter
def attr(obj, name):
    value = getattr(obj, name, "")
    if isinstance(value, bool):
        return "Sí" if value else "No"
    return value


@register.filter
def has_role(user, role):
    if not user.is_authenticated:
        return False
    return user.is_superuser or user.groups.filter(name=role).exists()


@register.filter
def role_name(user):
    if user.is_superuser:
        return "Administrador"
    group = user.groups.order_by("name").first()
    return group.name if group else "Sin rol"
