# Sistema de Gestión de Facturación e Inventario para Calzados Meycif

## Descripción del proyecto

El presente proyecto consiste en el desarrollo de un Sistema de Gestión de Facturación e Inventario para la Empresa de Calzados Meycif. El sistema permite administrar productos, controlar el stock, registrar clientes, gestionar ventas, emitir comprobantes y generar reportes para mejorar el control administrativo de la empresa.

## Sprint 0 Goal

El equipo tiene el repositorio configurado en GitHub, Git Flow activo, estructura base del proyecto creada, documentación inicial preparada y tablero Kanban listo para la planificación del desarrollo.

## Equipo de trabajo

| Rol | Integrante | GitHub |
|---|---|---|
| Product Owner | Aldair Sánchez | R01133A@upla.edu.pe |
| Scrum Master | Daniel Hinostroza | R01070F@upla.edu.pe |
| QA / DevOps | Jhon Carbajal | R010575@upla.edu.pe |

## Stack Tecnológico

- Node.js
- Express.js
- HTML5
- CSS3
- JavaScript
- JSON como almacenamiento inicial
- Git y GitHub
- Git Flow

## Módulos principales

- Gestión de usuarios
- Gestión de productos
- Gestión de inventario
- Gestión de clientes
- Gestión de proveedores
- Gestión de ventas
- Gestión de facturación
- Reportes del sistema

## Estructura del proyecto

```txt
sgfi-calzados-meycif/
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── modules/
│       ├── auth.js
│       ├── billing.js
│       ├── customers.js
│       ├── dashboard.js
│       ├── products.js
│       ├── reports.js
│       ├── sales.js
│       ├── stock.js
│       ├── suppliers.js
│       └── users.js
├── database.js
├── database.json
├── package.json
├── package-lock.json
└── server.js
