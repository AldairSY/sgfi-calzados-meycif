# Sistema de Gestión de Facturación e Inventario - Calzados Meycif

Proyecto integrador de la Universidad Peruana Los Andes para el curso
Construcción de Software, desarrollado con Python 3.13 y Django 5.2.

## Equipo PROYECTA FUTURO

- Enciso Carbajal Jhon Ever - Scrum Master y desarrollador.
- Hinostroza Canchumanya Luis Daniel - Product Owner.
- Sanchez Romero Aldair Ulises - Desarrollador y responsable frontend.

## Stack técnico

- Python 3.13.14.
- Django 5.2.16.
- SQLite.
- HTML5 y CSS3.
- Arquitectura `Models → Forms/Views → Templates/API`.

## Funcionalidades

- Autenticación y sesiones de Django.
- CRUD de productos, clientes y proveedores.
- Roles Administrador, Vendedor y Almacenero.
- Movimientos de inventario protegidos por transacciones.
- Ventas de varios productos con precio e IGV calculados en el servidor.
- Correlativos de boleta y factura.
- Comprobantes imprimibles.
- Anulación de ventas con reposición automática de stock.
- Gestión de usuarios y contraseñas.
- Reportes de stock bajo y productos más vendidos.
- Exportación CSV y registro de auditoría.
- API JSON de solo lectura para productos y ventas.
- Patrones Factory y Strategy para comprobantes.
- Pruebas automatizadas de autenticación, permisos, inventario y ventas.

## Ejecución local

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_demo --password "EligeUnaClaveSegura"
python manage.py runserver
```

Abrir `http://127.0.0.1:8000/`. El comando crea las cuentas `admin`,
`vendedor` y `almacenero`, todas con la clave elegida.

## Permisos

- **Administrador:** acceso total, usuarios, auditoría y reportes.
- **Vendedor:** consulta productos y gestiona clientes y ventas.
- **Almacenero:** gestiona productos, proveedores e inventario.

## Arquitectura

```text
config/                  Configuración y rutas principales
gestion/models.py        Modelos y relaciones de datos
gestion/forms.py         Formularios y validaciones
gestion/views.py         Vistas HTML y API de solo lectura
gestion/services.py      Transacciones y patrones de diseño
gestion/permissions.py   Autorización basada en roles
templates/               Interfaz Django
static/                  Estilos
gestion/tests.py         Pruebas automatizadas
```
