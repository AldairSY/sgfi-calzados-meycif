from django import forms

from django.contrib.auth import get_user_model
from django.contrib.auth.forms import SetPasswordForm, UserCreationForm
from django.forms import formset_factory

from .models import Cliente, Producto, Proveedor, Venta
from .permissions import ADMINISTRADOR, ALMACENERO, VENDEDOR


class EstiloFormularioMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault("class", "form-control")


class ProductoForm(EstiloFormularioMixin, forms.ModelForm):
    class Meta:
        model = Producto
        fields = [
            "codigo",
            "categoria",
            "marca",
            "modelo",
            "talla",
            "color",
            "precio",
            "stock",
            "stock_minimo",
            "activo",
        ]


class ClienteForm(EstiloFormularioMixin, forms.ModelForm):
    class Meta:
        model = Cliente
        fields = [
            "tipo_documento",
            "numero_documento",
            "nombres_razon_social",
            "telefono",
            "direccion",
            "activo",
        ]

    def clean_numero_documento(self):
        numero = self.cleaned_data["numero_documento"]
        tipo = self.cleaned_data.get("tipo_documento")
        longitud = 8 if tipo == Cliente.DNI else 11
        if len(numero) != longitud:
            raise forms.ValidationError(f"El {tipo} debe tener {longitud} dígitos.")
        return numero


class ProveedorForm(EstiloFormularioMixin, forms.ModelForm):
    class Meta:
        model = Proveedor
        fields = ["razon_social", "ruc", "telefono", "direccion", "activo"]


class MovimientoStockForm(EstiloFormularioMixin, forms.Form):
    producto = forms.ModelChoiceField(queryset=Producto.objects.filter(activo=True))
    tipo = forms.ChoiceField(choices=[("INGRESO", "Ingreso"), ("SALIDA", "Salida")])
    cantidad = forms.IntegerField(min_value=1)
    motivo = forms.CharField(max_length=150)


class VentaForm(EstiloFormularioMixin, forms.Form):
    cliente = forms.ModelChoiceField(queryset=Cliente.objects.filter(activo=True))
    tipo_comprobante = forms.ChoiceField(choices=[("BOLETA", "Boleta"), ("FACTURA", "Factura")])


class DetalleVentaForm(EstiloFormularioMixin, forms.Form):
    producto = forms.ModelChoiceField(queryset=Producto.objects.filter(activo=True))
    cantidad = forms.IntegerField(min_value=1)


DetalleVentaFormSet = formset_factory(
    DetalleVentaForm, extra=3, min_num=1, validate_min=True
)


class AnulacionForm(EstiloFormularioMixin, forms.Form):
    motivo = forms.CharField(max_length=200, widget=forms.Textarea(attrs={"rows": 3}))


class UsuarioForm(EstiloFormularioMixin, UserCreationForm):
    rol = forms.ChoiceField(
        choices=[
            (ADMINISTRADOR, "Administrador"),
            (VENDEDOR, "Vendedor"),
            (ALMACENERO, "Almacenero"),
        ]
    )

    class Meta(UserCreationForm.Meta):
        model = get_user_model()
        fields = ("username", "first_name", "last_name", "email", "rol")


class UsuarioEditarForm(EstiloFormularioMixin, forms.ModelForm):
    rol = forms.ChoiceField(
        choices=[
            (ADMINISTRADOR, "Administrador"),
            (VENDEDOR, "Vendedor"),
            (ALMACENERO, "Almacenero"),
        ]
    )

    class Meta:
        model = get_user_model()
        fields = ("username", "first_name", "last_name", "email", "is_active", "rol")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            grupo = self.instance.groups.first()
            self.fields["rol"].initial = (
                "Administrador" if self.instance.is_superuser else grupo.name if grupo else ""
            )


class UsuarioPasswordForm(EstiloFormularioMixin, SetPasswordForm):
    pass
