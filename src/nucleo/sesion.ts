import type { AuthProviderNoUserManagerProps } from 'react-oidc-context';
import type { Configuracion } from './configuracion';

/**
 * Configuración de react-oidc-context para el cliente público `portal` del realm (001, diseño «Portal»).
 * oidc-client-ts usa el flujo de código con PKCE (S256) por defecto.
 * `origen` es el origen del portal (en desarrollo, http://localhost:4300).
 */
export function crearConfiguracionOidc(configuracion: Configuracion, origen: string): AuthProviderNoUserManagerProps {
  const inicio = `${origen.replace(/\/+$/, '')}/`;
  return {
    authority: `${configuracion.keycloakUrl}/realms/${configuracion.realm}`,
    client_id: configuracion.clientId,
    redirect_uri: inicio,
    post_logout_redirect_uri: inicio,
    response_type: 'code',
    scope: 'openid profile',
    automaticSilentRenew: true,
    onSigninCallback: quitarParametrosDeInicioDeSesion,
  };
}

/** Al volver de Keycloak, quita `code`, `state` y `session_state` de la URL para que no queden en el historial. */
export function quitarParametrosDeInicioDeSesion(): void {
  const url = new URL(window.location.href);
  for (const parametro of ['code', 'state', 'session_state', 'iss']) {
    url.searchParams.delete(parametro);
  }
  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
}

/** Lo que el portal necesita del usuario con sesión. */
export interface UsuarioPortal {
  /** `sub` del token. */
  id: string;
  /** Nombre completo (`name`), o el usuario si no hay nombre. */
  nombre: string;
  /** Roles del realm (`realm_access.roles` del token de acceso). */
  roles: string[];
  /** Cliente de Keycloak con el que se inició sesión. */
  azp: string | undefined;
}

interface DatosToken {
  sub?: string;
  azp?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: unknown };
}

/**
 * Lee el usuario de la sesión de oidc-client-ts. Los roles del realm vienen solo en el token de acceso (Keycloak no los
 * pone en el token de identidad por defecto), así que se lee su contenido; la firma la validan los servicios.
 */
export function leerUsuario(
  usuario: { access_token: string; profile: Record<string, unknown> } | null | undefined,
): UsuarioPortal | null {
  if (!usuario) return null;
  const token = leerDatosToken(usuario.access_token);
  const perfil = usuario.profile as DatosToken;
  const roles = token.realm_access?.roles ?? perfil.realm_access?.roles;
  return {
    id: token.sub ?? perfil.sub ?? '',
    nombre: perfil.name ?? token.name ?? perfil.preferred_username ?? token.preferred_username ?? '',
    roles: Array.isArray(roles) ? roles.filter((rol): rol is string => typeof rol === 'string') : [],
    azp: token.azp ?? perfil.azp,
  };
}

function leerDatosToken(token: string): DatosToken {
  const contenido = token.split('.')[1];
  if (!contenido) return {};
  try {
    const base64 = contenido.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(contenido.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
    const datos: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof datos === 'object' && datos !== null ? (datos as DatosToken) : {};
  } catch {
    return {};
  }
}
