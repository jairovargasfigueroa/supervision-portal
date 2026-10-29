# Portal del cliente: contratos

**Estado:** lo de abajo es lo que usa el portal desde la 008. El detalle de cada operación está en `docs/contratos/rest.md` de la carpeta general (sección «Obras»).

## Consume

| Desde | Qué |
|---|---|
| Keycloak | Inicio de sesión OIDC (realm `supervision`, cliente público `portal` con PKCE) |
| Obras (REST, `VITE_OBRAS_URL`) | Mis obras, avance, fotos publicadas, planillas; aprobar u observar planilla (abajo) |

## Obras (REST)

Todas las llamadas llevan `Authorization: Bearer <token de acceso>` (el de `react-oidc-context`, que se renueva solo). Obras filtra por el cliente dueño de la obra (`azp = portal`) y nunca devuelve borradores.

| Operación | Para qué | Pantalla |
|---|---|---|
| `GET /obras` | Nombre, ubicación, `avancePct` y `plazoPct` de cada obra | Mis obras (`/`) |
| `GET /obras/{id}` | Avance por partida (`partidas[]`: código, nombre, unidad, contratado, `ejecutadaAcumulada`, `avancePct`) | Detalle de obra |
| `GET /obras/{id}/fotos?pagina=&tamano=` | Fotos publicadas con `urlDescarga` (galería de la obra de a 20; para las fotos de respaldo de una planilla se recorren páginas de 100 y se toman las de `fotoIds`) | Detalle de obra y de planilla |
| `GET /obras/{id}/planillas` | Número, periodo, estado, neto y `cobroNumero` | Detalle de obra |
| `GET /planillas/{id}` | Líneas, totales, `observacion`, `cobroNumero`, `fotoIds` | Detalle de planilla (cada 2 s mientras está `APROBANDO`, hasta 4 minutos) |
| `POST /planillas/{id}/aprobar` | Inicia la saga; responde `202 { estado: "APROBANDO" }` | Detalle de planilla |
| `POST /planillas/{id}/observar` `{ motivo }` | Motivo de 10 a 500 caracteres; responde `200` con el detalle (`OBSERVADA`) | Detalle de planilla |

## Errores

Problem Details con `codigo` (`docs/convenciones.md`). El texto para el usuario sale de `src/nucleo/errores.ts` (copiado de `docs/mensajes.md`); un código desconocido muestra el genérico de su estado. Códigos propios que espera el portal: `OBRA_NO_ENCONTRADA`, `PLANILLA_NO_ENCONTRADA`, `PLANILLA_NO_PRESENTADA` (409) y `MOTIVO_INVALIDO` (422). Un `503 SERVICIO_NO_DISPONIBLE` en las fotos (por ejemplo, S3 sin configurar) solo deja en error la sección de fotos.
