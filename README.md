# Sistema de Gestión de Facturación e Inventario para Calzados Meycif

Proyecto integrador desarrollado con **Python 3.13 y Django 5.2**, aplicando
Scrum y el patrón técnico solicitado en clase:

```text
Models → Forms/Views → Templates/API
```

La implementación anterior en Node/Express se conserva como referencia. La
versión evaluable del curso se ejecuta mediante `manage.py`.

## Funcionalidades

- Autenticación y sesiones de Django.
- CRUD de productos, clientes y proveedores.
- Movimientos de inventario protegidos por transacciones.
- Registro de ventas con precio e IGV calculados en el servidor.
- Correlativos de boleta y factura.
- Reportes de stock bajo y productos más vendidos.
- API JSON de solo lectura para productos y ventas.
- Factory y Strategy para generar comprobantes.
- Pruebas automatizadas de autenticación, inventario y ventas.

## Puesta en marcha

En Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_demo --password "EligeUnaClaveSegura"
python manage.py runserver
```

Abrir `http://127.0.0.1:8000/` e ingresar con el usuario `admin` y la clave
elegida en `cargar_demo`.

## Arquitectura

```text
config/                  Configuración y rutas principales
gestion/models.py        Modelos y relaciones de datos
gestion/forms.py         Formularios y validaciones
gestion/views.py         Vistas HTML y API de solo lectura
gestion/services.py      Casos de uso transaccionales y patrones
templates/               Interfaz Django
static/                  Estilos
gestion/tests.py         Pruebas automatizadas
```
