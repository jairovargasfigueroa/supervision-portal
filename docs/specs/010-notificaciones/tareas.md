# 010 · Notificaciones · tareas de `frontend/portal`

Requisitos y diseño: `docs/specs/010-notificaciones/` de la carpeta que agrupa los proyectos. Contratos: `docs/contratos.md` de este proyecto.

Marca cada tarea al terminarla (con sus pruebas y su commit).

- [ ] Variables `VITE_NOTIFICACIONES_URL` (obligatoria) y `VITE_FIREBASE_*` (todas o ninguna) en el esquema Zod y en `.env.example`; `api/cliente.ts` con URL base por parámetro
- [ ] `src/notificaciones/api.ts` (`queryOptions` del contador y de la lista infinita, mutaciones marcar una y todas) y `rutas-notificacion.ts`; pruebas
- [ ] `Campana.tsx` en la barra superior de `__root.tsx` (contador con «9+», cada 60 s, lista, «Ver más», «Marcar todas como leídas», vacío, error)
- [ ] Ruta `notificaciones.abrir.tsx` (search validado con Zod, marca leída y navega)
- [ ] Instalar `firebase` 13; `push-web.ts` (como el shell: permiso con gesto, token, `POST /dispositivos` con `aplicacion: "portal"`, `onMessage` → `Snackbar`, baja y `deleteToken` al cerrar sesión) y `public/firebase-messaging-sw.js` (copia del shell)
- [ ] Pruebas de la spec y README (cómo activar Firebase en el portal)
