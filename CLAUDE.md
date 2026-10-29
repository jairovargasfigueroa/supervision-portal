# Portal del cliente

Aplicación web externa para el cliente: ver el avance de sus obras con fotos y aprobar u observar las planillas.

Parte de la «Plataforma de supervisión de obras». Si existe `../../CLAUDE.md` (carpeta que agrupa todos los proyectos), léelo primero: tiene las reglas transversales, el plan y los contratos generales.

**Estado:** fase 1 (tema, fuentes, `formato.ts`, estados vacío y error), 001 (inicio de sesión con Keycloak, rutas protegidas, `SinAcceso` y barra con «Cerrar sesión») y 008 (cliente REST de Obras, Mis obras, detalle de obra y detalle de planilla con aprobar y observar). No implementes una funcionalidad sin su especificación aprobada en `docs/specs/`.

## Stack

- Node 24 · React 19 · Vite 8 · TypeScript 7 (lo trae la plantilla) · MUI 9 · lint con oxlint · pruebas con Vitest + Testing Library (jsdom)
- TanStack Router por archivos (`src/routes/`, genera `src/routeTree.gen.ts`) · TanStack Query 5 · Zod 4
- react-oidc-context 3 + oidc-client-ts 3 (login con Keycloak, cliente `portal`, rol `cliente`); REST hacia Obras (`VITE_OBRAS_URL`) con el token
- TanStack Form 1 (diálogo de observar) · TanStack Table 9 (tablas de partidas y de líneas)
- Puerto: `4300`. Variables en `.env` (copia `.env.example`; Keycloak en `http://localhost:8080`)

## Comandos

```sh
npm install
cp .env.example .env # una vez
npm run dev          # http://localhost:4300
npm run build        # tsc -b && vite build
npm run lint
npm test             # vitest run
npm run preview      # sirve lo compilado
```

## Estructura

Ver `docs/estructura.md` (obligatorio): `routes/`, `api/`, `componentes/`, `nucleo/` y `tema.ts`.

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
