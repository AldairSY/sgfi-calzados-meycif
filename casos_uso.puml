@startuml
title Casos de Uso - Sistema de Facturación MEYCIF

left to right direction

actor Administrador
actor Vendedor

rectangle "Sistema de Facturación" {

    usecase "Iniciar Sesión" as CU1
    usecase "Registrar Venta" as CU2
    usecase "Generar Comprobante" as CU3
    usecase "Calcular IGV" as CU4
    usecase "Registrar Clientes" as CU5
    usecase "Generar Reportes" as CU6

}

Administrador --> CU1
Administrador --> CU2
Administrador --> CU3
Administrador --> CU4
Administrador --> CU5
Administrador --> CU6

Vendedor --> CU1
Vendedor --> CU2
Vendedor --> CU3
Vendedor --> CU4
Vendedor --> CU5

CU2 .> CU4 : <<include>>
CU2 .> CU3 : <<include>>

@enduml
