from django import template

register = template.Library()


@register.filter
def attr(obj, name):
    value = getattr(obj, name, "")
    if isinstance(value, bool):
        return "Sí" if value else "No"
    return value
