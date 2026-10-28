# Portal del cliente

Aplicación web externa para el cliente: ver el avance de sus obras con fotos y aprobar u observar las planillas.

Parte de la «Plataforma de supervisión de obras». Si existe `../../CLAUDE.md` (carpeta que agrupa todos los proyectos), léelo primero: tiene las reglas transversales, el plan y los contratos generales.

**Estado:** solo documentación. El proyecto del framework todavía no se generó (tarea de la fase 1 del plan general). No implementes una funcionalidad sin su especificación aprobada en `docs/specs/`.

## Stack

- React
- Inicio de sesión con Keycloak (OIDC), rol `cliente`
- REST hacia Obras

## Comandos

Se completan al generar el proyecto.

## Estructura prevista

```
src/
  obras/          mis obras, avance y fotos publicadas
  planillas/      detalle, aprobar u observar (con motivo)
  auth/           sesión con Keycloak
```

## Reglas del proyecto

- Usa REST (no GraphQL).
- El cliente solo ve sus obras; lo valida Obras con el token.
- Aprobar una planilla inicia la saga: la pantalla muestra «en aprobación» hasta que termine.
- Observar exige un motivo.

## Documentación

- `docs/app.md`: qué hace, pantallas o responsabilidades, y qué no hace.
- `docs/contratos.md`: qué consume y qué expone.
- `docs/specs/`: especificaciones por funcionalidad (`requisitos.md`, `diseno.md`, `tareas.md`).

## Commits

Conventional Commits en español e imperativo (`feat(alcance): descripción`). Sin coautoría ni firmas de la IA.
