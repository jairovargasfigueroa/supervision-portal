# Portal del cliente: estructura y librerías

Obligatorio para todo el código de este proyecto.

## Librerías

React 19 + Vite 8, MUI 9 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`), `@tanstack/react-router` 1 + `@tanstack/router-plugin` (rutas por archivos en `src/routes/`), `@tanstack/react-query` 5, `@tanstack/react-table` 9, `@tanstack/react-form` 1 + `zod` 4, `react-oidc-context` 3 + `oidc-client-ts` 3. Pruebas: Vitest + `@testing-library/react` + `jsdom`.

## Tema

`src/tema.ts` con los mismos valores que los microfrontends React (`docs/diseno-visual.md`); `CssBaseline` normal (no hay Shadow DOM). Fuentes Inter e IBM Plex Mono en `index.html`. Densidad normal (no compacta).

- `tema.ts` exporta `tema` (el `createTheme`), `colores` (todos los tokens, también los suaves para chips y avisos) y `estiloNumero` (IBM Plex Mono con `tabular-nums`). Para números sueltos: `<Typography variant="numero">`.
- Botones y campos con radio 6 (`MuiButton`, `MuiOutlinedInput`), chips 999; el resto 10. Botones sin mayúsculas forzadas y de al menos 44 px de alto (objetivo táctil).
- Iconos de `@mui/icons-material` 9 por ruta (`@mui/icons-material/InboxOutlined`). En la 9 algunos nombres cambiaron (por ejemplo `ErrorOutline` es `ErrorOutlineOutlined`).

## Árbol

```
src/
  main.tsx                     # valida variables; AuthProvider → QueryClientProvider → ThemeProvider → RouterProvider
  tema.ts
  routeTree.gen.ts             # lo genera @tanstack/router-plugin desde routes/ (se sube al repo: `tsc -b` lo necesita; no se edita ni se revisa con lint)
  routes/                      # TanStack Router por archivos (cada archivo exporta solo `Route`)
    __root.tsx                 # diseño: barra superior con usuario y cerrar sesión; protección de sesión y rol cliente
    index.tsx                  # Mis obras
    obras.$obraId.tsx          # Detalle de obra
    planillas.$planillaId.tsx  # Detalle de planilla, aprobar u observar
    sin-acceso.tsx             # usa componentes/SinAcceso.tsx
  api/
    cliente.ts                 # fetch a VITE_OBRAS_URL con el token; Problem Details → error tipado
    obras.ts, planillas.ts     # funciones + queryOptions de TanStack Query
  componentes/
    BarraSuperior.tsx, SinAcceso.tsx
    TablaDatos.tsx, EstadoChip.tsx, EstadoVacio.tsx, EstadoError.tsx, GaleriaFotos.tsx
    ObservarDialogo.tsx (TanStack Form + Zod: motivo 10–500), AprobarDialogo.tsx
  nucleo/
    configuracion.ts           # variables VITE_* validadas con Zod (leerConfiguracion)
    sesion.ts                  # configuración de react-oidc-context y leerUsuario (nombre, roles y azp del token)
    roles.ts                   # rolesEfectivos(roles, azp) y tieneAcceso(roles, azp)
    formato.ts, errores.ts
```

Las pruebas van junto al código, con sufijo `.test.ts` / `.test.tsx` (`nucleo/formato.test.ts`, `componentes/estados.test.tsx`).

## Reglas

- Datos siempre con TanStack Query (`queryOptions` por recurso; `refetchInterval: 2000` mientras la planilla está `APROBANDO`).
- Mutaciones (`aprobar`, `observar`) invalidan las consultas de la planilla y de la obra.
- Los parámetros de ruta se validan con Zod en la definición de la ruta.
- Variables de entorno `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` y `VITE_OBRAS_URL` (`.env`, copia de `.env.example`) validadas al iniciar con Zod.

## Sesión (001)

- `AuthProvider` de react-oidc-context con `authority = ${VITE_KEYCLOAK_URL}/realms/${VITE_KEYCLOAK_REALM}`, `client_id = portal`, `redirect_uri` y `post_logout_redirect_uri` = origen del portal, `automaticSilentRenew` y PKCE (por defecto). Al volver de Keycloak, `onSigninCallback` quita `code`, `state`, `session_state` e `iss` de la URL.
- `routes/__root.tsx` protege todas las rutas: sin sesión llama a `signinRedirect()`; si la renovación del token falla o el token vence, vuelve a `signinRedirect()`; sin rol `cliente` lleva a `/sin-acceso`, y con él no deja entrar a `/sin-acceso`.
- Los roles del realm vienen solo en el token de acceso (Keycloak no los pone en el de identidad), así que `leerUsuario` lee su contenido (sin validar la firma: eso lo hacen los servicios).
- Usuario con varios roles (`docs/convenciones.md`): solo cuentan los roles del `azp` del token; en el portal, `cliente`. `demo1` (residente y cliente) entra como cliente.

## Pruebas

Vitest + Testing Library: rutas protegidas, diálogo de observar (validación), formato, estados vacío y error. `npm test` (`vitest run`, entorno `jsdom`, configurado en `vite.config.ts`). Sin `globals`: cada prueba importa `describe`/`it`/`expect` de `vitest` y las de componentes llaman a `cleanup` en `afterEach`.
