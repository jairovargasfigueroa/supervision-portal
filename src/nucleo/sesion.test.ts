import { afterEach, describe, expect, it } from 'vitest';
import { crearConfiguracionOidc, quitarParametrosDeInicioDeSesion } from './sesion';

const configuracion = {
  keycloakUrl: 'http://localhost:8080',
  realm: 'supervision',
  clientId: 'portal',
  obrasUrl: 'http://localhost:8081',
};

describe('crearConfiguracionOidc', () => {
  it('apunta al realm supervision con el cliente portal y renovación silenciosa', () => {
    const oidc = crearConfiguracionOidc(configuracion, 'http://localhost:4300');
    expect(oidc.authority).toBe('http://localhost:8080/realms/supervision');
    expect(oidc.client_id).toBe('portal');
    expect(oidc.redirect_uri).toBe('http://localhost:4300/');
    expect(oidc.post_logout_redirect_uri).toBe('http://localhost:4300/');
    expect(oidc.response_type).toBe('code');
    expect(oidc.automaticSilentRenew).toBe(true);
  });
});

describe('quitarParametrosDeInicioDeSesion', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('quita code, state y session_state y conserva lo demás', () => {
    window.history.replaceState(null, '', '/?code=abc&state=xyz&session_state=123&iss=k&otro=1#arriba');
    quitarParametrosDeInicioDeSesion();
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?otro=1');
    expect(window.location.hash).toBe('#arriba');
  });
});
