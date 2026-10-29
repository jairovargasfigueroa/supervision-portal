import { afterEach, describe, expect, it } from 'vitest';
import { crearConfiguracionOidc, leerUsuario, quitarParametrosDeInicioDeSesion } from './sesion';

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

/** Token de prueba sin firma (solo se lee su contenido). */
function tokenDePrueba(datos: Record<string, unknown>): string {
  const base64url = (texto: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(datos))}.firma`;
}

describe('leerUsuario', () => {
  it('lee nombre del perfil y roles y azp del token de acceso', () => {
    const usuario = leerUsuario({
      access_token: tokenDePrueba({
        sub: 'a0000000-0000-4000-8000-000000000009',
        azp: 'portal',
        realm_access: { roles: ['default-roles-supervision', 'residente', 'cliente'] },
      }),
      profile: { sub: 'a0000000-0000-4000-8000-000000000009', name: 'Lucía Paz Antelo' },
    });
    expect(usuario).toEqual({
      id: 'a0000000-0000-4000-8000-000000000009',
      nombre: 'Lucía Paz Antelo',
      roles: ['default-roles-supervision', 'residente', 'cliente'],
      azp: 'portal',
    });
  });

  it('sin nombre usa el usuario; con un token ilegible no tiene roles', () => {
    const usuario = leerUsuario({ access_token: 'no-es-un-jwt', profile: { preferred_username: 'cliente1' } });
    expect(usuario?.nombre).toBe('cliente1');
    expect(usuario?.roles).toEqual([]);
    expect(usuario?.azp).toBeUndefined();
  });

  it('sin sesión devuelve null', () => {
    expect(leerUsuario(null)).toBeNull();
  });
});
