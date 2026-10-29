# Portal del cliente

Aplicación web externa para el cliente: ver el avance de sus obras con fotos y aprobar u observar las planillas.

Parte de la «Plataforma de supervisión de obras». Si existe `../../CLAUDE.md` (carpeta que agrupa todos los proyectos), léelo primero: tiene las reglas transversales, el plan y los contratos generales.

**Estado:** proyecto generado con la plantilla oficial de Vite, sin pantallas propias. No implementes una funcionalidad sin su especificación aprobada en `docs/specs/`.

## Stack

- Node 24 · React 19 · Vite 8 · TypeScript 7 (lo trae la plantilla) · lint con oxlint
- Previsto: react-oidc-context 3 + oidc-client-ts (login con Keycloak, rol `cliente`); REST hacia Obras
- Puerto: `4300`

## Comandos

```sh
npm install
npm run dev          # http://localhost:4300
npm run build        # tsc -b && vite build
npm run lint
npm run preview      # sirve lo compilado
```

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

- `docs/estructura.md`: **librerías permitidas y estructura exacta de carpetas y archivos. Obligatorio leerlo antes de escribir código.**
- `docs/app.md`: pantallas y qué no hace.
- `docs/contratos.md`: qué consume.
- `docs/specs/`: especificaciones por funcionalidad (`requisitos.md`, `diseno.md`, `tareas.md`).

## Commits

Conventional Commits en español e imperativo (`feat(planillas): agrega aprobación de planilla`). Sin coautoría ni firmas de la IA.

Git Flow: ramas `feat/`, `fix/`, `docs/`… desde `develop`, que entran por *pull request*; nunca hagas *push* a `main` ni a `develop` (están protegidas). El agente crea y fusiona los PR (merge normal, sin squash) hacia `develop` cuando todas las pruebas pasan. Detalle y definición de terminado: `docs/flujo-trabajo.md` del repo `supervision-docs`.
