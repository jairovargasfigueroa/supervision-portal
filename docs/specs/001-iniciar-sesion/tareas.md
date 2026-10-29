# 001 · Iniciar sesión y paso entre aplicaciones · tareas de `frontend/portal`

Requisitos y diseño: `docs/specs/001-iniciar-sesion/` de la carpeta que agrupa los proyectos. Contratos: `docs/contratos.md` de este proyecto.

Marca cada tarea al terminarla (con sus pruebas y su commit).

- [x] Instalar `react-oidc-context` y `oidc-client-ts`; configurar `AuthProvider` (realm `supervision`, cliente `portal`, renovación silenciosa)
- [x] Ruta protegida, pantalla `SinAcceso` sin rol `cliente` y barra superior con «Cerrar sesión»
- [ ] Pruebas de la ruta protegida y `SinAcceso`
