# Portal del cliente: qué hace

## Pantallas

| Pantalla | Caso de uso | Etapa |
|---|---|---|
| Mis obras (lista con avance) | Ver obra | Base |
| Detalle de obra (avance por partida y fotos publicadas) | Ver obra | Base |
| Planilla (detalle, aprobar u observar con motivo) | Revisar planilla | Base |

- **Mis obras** (`/`): una tarjeta por obra con nombre, ubicación, avance físico % y plazo transcurrido %.
- **Detalle de obra** (`/obras/:id`): avance por partida (en el celular, código, unidad, contratado y ejecutado en el detalle desplegable de cada fila), planillas sin borradores (número, periodo, estado, neto y cobro) y galería de fotos publicadas («Cargar más fotos»).
- **Planilla** (`/planillas/:id`): líneas, totales y fotos de respaldo; con `PRESENTADA`, «Aprobar» (confirmación y espera «En aprobación…», aviso a los 90 s, corte a los 4 minutos con «Actualizar») y «Observar» (motivo de 10 a 500 con contador), fijos al pie en el celular. Resultado: «Planilla aprobada» con el número de cobro u «Planilla observada» con el motivo.
- Cada sección carga y falla por su cuenta: si Obras no puede dar las fotos (`503`), solo la galería muestra «No disponible por el momento.».

Usuario: cliente con contrato. Su cuenta la crea la constructora en Keycloak.

Referencia visual: el prototipo HTML de la carpeta general.

## Qué no hace

- No permite registrarse (sin autoregistro).
- No muestra datos internos (costos de material, otras obras, cobros de otros clientes).
