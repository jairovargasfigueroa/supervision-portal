# Portal del cliente: estructura y librerías

Obligatorio para todo el código de este proyecto.

## Librerías

React 19 + Vite 8, MUI 9 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`), `@tanstack/react-router` 1 + `@tanstack/router-plugin` (rutas por archivos en `src/routes/`), `@tanstack/react-query` 5, `@tanstack/react-table` 9, `@tanstack/react-form` 1 + `zod` 4, `react-oidc-context` 3 + `oidc-client-ts` 3. Pruebas: Vitest + `@testing-library/react` + `jsdom`.

## Tema

`src/tema.ts` con los mismos valores que los microfrontends React (`docs/diseno-visual.md`); `CssBaseline` normal (no hay Shadow DOM). Fuentes Inter e IBM Plex Mono en `index.html`. Densidad normal (no compacta).

## Árbol

```
src/
  main.tsx                     # AuthProvider → QueryClientProvider → ThemeProvider → RouterProvider
  tema.ts
  routes/                      # TanStack Router por archivos
    __root.tsx                 # diseño: barra superior con usuario y cerrar sesión; protección de sesión y rol cliente
    index.tsx                  # Mis obras
    obras.$obraId.tsx          # Detalle de obra
    planillas.$planillaId.tsx  # Detalle de planilla, aprobar u observar
    sin-acceso.tsx
  api/
    cliente.ts                 # fetch a VITE_OBRAS_URL con el token; Problem Details → error tipado
    obras.ts, planillas.ts     # funciones + queryOptions de TanStack Query
  componentes/
    TablaDatos.tsx, EstadoChip.tsx, EstadoVacio.tsx, EstadoError.tsx, GaleriaFotos.tsx
    ObservarDialogo.tsx (TanStack Form + Zod: motivo 10–500), AprobarDialogo.tsx
  nucleo/
    formato.ts, errores.ts
```

## Reglas

- Datos siempre con TanStack Query (`queryOptions` por recurso; `refetchInterval: 2000` mientras la planilla está `APROBANDO`).
- Mutaciones (`aprobar`, `observar`) invalidan las consultas de la planilla y de la obra.
- Los parámetros de ruta se validan con Zod en la definición de la ruta.
- Variables de entorno `VITE_KEYCLOAK_URL`, `VITE_OBRAS_URL` validadas al iniciar con Zod.

## Pruebas

Vitest + Testing Library: rutas protegidas, diálogo de observar (validación), formato.
