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
