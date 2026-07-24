from django import forms

from .models import Cliente, Producto, Proveedor


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
    producto = forms.ModelChoiceField(queryset=Producto.objects.filter(activo=True))
    cantidad = forms.IntegerField(min_value=1)
    tipo_comprobante = forms.ChoiceField(choices=[("BOLETA", "Boleta"), ("FACTURA", "Factura")])
