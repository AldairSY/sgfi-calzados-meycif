# 📑 REPORTE DE AVANCE DE PROYECTO - SPRINT 1

---

## 🏢 CARÁTULA DEL ENTREGABLE

| INFORMACIÓN ACADÉMICA Y DEL PROYECTO | DETALLES ESPECÍFICOS |
| :--- | :--- |
| **Universidad** | Universidad Peruana Los Andes (UPLA) |
| **Facultad / Escuela** | Facultad de Ingeniería / Escuela Profesional de Ingeniería de Sistemas |
| **Ciclo Académico** | VI Ciclo |
| **Curso** | Construcción de Software |
| **Proyecto de Desarrollo** | Sistema de Gestión de Facturación e Inventario - Meycif |
| **Empresa Beneficiaria** | Empresa de Calzados "Meycif" |
| **Estudiante / Desarrollador** | Daniel |
| **Rol en el Equipo Scrum** | Frontend Developer / Core Integrator |
| **Fase Actual** | Sprint 1 - Especificación y Arquitectura Base |
| **Fecha de Entrega** | Mayo de 2026 |

---

## 📌 1. INTRODUCCIÓN Y CONTEXTO DEL SPRINT

Durante el inicio del Sprint 1, el objetivo principal del equipo fue establecer la arquitectura base del software y garantizar la sincronización absoluta de los entornos de desarrollo locales con el repositorio centralizado en GitHub administrado por el compañero Aldair.

Como desarrollador del equipo, mi enfoque inicial se centró en la preparación del entorno, la resolución de divergencias en el código base y la mitigación de conflictos de fusión (*Merge Conflicts*), asegurando la integridad de las ramas antes de iniciar con el despliegue de las interfaces gráficas en React.

Adicionalmente, se dio inicio al proceso de levantamiento de información y modelado de requisitos técnicos para el negocio de calzados **Meycif**, con la finalidad de traducir las necesidades de control de inventario y facturación en artefactos de ingeniería de software claros y legibles para todo el equipo de desarrollo.

---

## 🗺️ 2. DIAGRAMA DE CASOS DE USO DEL SISTEMA

A continuación, se integra el modelado visual de los Casos de Uso desarrollados para el sistema, el cual define el alcance de las interacciones entre los usuarios operativos y la lógica del negocio:

![Diagrama de Casos de Uso - Meycif](image_99a231.png)

### 👥 Descripción de los Actores y Límites del Sistema:
* **Administrador / Operador de Tienda:** Personal de la empresa Meycif encargado de interactuar con el sistema para realizar tareas diarias como la consulta de stock de zapatillas, el registro de ventas y la emisión de comprobantes de pago.
* **Sistema (Servicios Backend):** Componente de software encargado de procesar las solicitudes de las interfaces, realizar las validaciones de seguridad pertinentes en la base de datos y mantener la persistencia de la información.
* **Límite del Sistema:** Define el alcance del software de facturación e inventario, delimitando qué acciones requieren conexión obligatoria con los servicios del servidor.

---

## 📊 3. MATRIZ DE ESPECIFICACIÓN DEL CASO DE USO: LOGIN

Para detallar el comportamiento del sistema durante el control de accesos, se ha estructurado la siguiente matriz técnica para el módulo de autenticación:

| Campo de Ingeniería | Especificación Técnica Detallada |
| :--- | :--- |
| **Caso de Uso** | **CU-01: Autenticación de Usuario (Login)** |
| **Actores** | Operador / Administrador del Sistema |
| **Propósito** | Validar la identidad de los empleados de la zapatería para restringir o permitir las funciones del sistema según su nivel de privilegio. |
| **Precondiciones** | El usuario debe estar previamente registrado en la base de datos de Meycif y poseer un estado activo. |
| **Flujo Básico (Normal)** | 1. El usuario abre la aplicación web y se dirige a la interfaz de inicio de sesión.<br>2. El sistema muestra los campos obligatorios de "Usuario" y "Contraseña".<br>3. El usuario digita sus credenciales correspondientes y presiona el botón "Iniciar Sesión".<br>4. El sistema cifra y envía las credenciales al backend para su validación contra la base de datos.<br>5. El sistema confirma la validez de los datos y redirige al usuario de forma segura al Dashboard principal. |
| **Flujos Alternos / Excepciones** | **4a. Credenciales Inválidas o Incorrectas:**<br>- El sistema detecta que el usuario o la contraseña no coinciden con los registros.<br>- El sistema bloquea el acceso a las vistas internas del software.<br>- Se despliega un mensaje de alerta genérico: *"Usuario o contraseña incorrectos"*, manteniendo la vista de login limpia por seguridad. |
| **Postcondiciones** | Se establece una sesión de usuario activa y segura en el navegador mediante el almacenamiento local de un token de autenticación. |

---

## 🏁 4. ESTADO DE LOS ENTREGABLES Y PRÓXIMOS PASOS

* **Sincronización del Repositorio:** Se concluyó con éxito la migración inicial de la documentación base, asegurando que la rama local `develop` se encuentre perfectamente alineada con el repositorio en la nube en GitHub.
* **Consolidación de Requisitos:** Toda la especificación técnica de casos de uso y lógica del negocio para la empresa de calzados Meycif ha quedado centralizada en este documento para el control y auditoría del docente del curso.
* **Fase de Codificación (Siguiente Paso):** Una vez aprobada la presente estructura por el equipo y la cátedra, se procederá con la inicialización del proyecto en React, instalando las dependencias base y maquetando las vistas del formulario de Login usando los componentes definidos en este Sprint.
