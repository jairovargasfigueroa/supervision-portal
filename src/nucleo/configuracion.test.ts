import { describe, expect, it } from 'vitest';
import { leerConfiguracion } from './configuracion';

const entornoValido = {
  VITE_KEYCLOAK_URL: 'http://localhost:8080',
  VITE_KEYCLOAK_REALM: 'supervision',
  VITE_KEYCLOAK_CLIENT_ID: 'portal',
  VITE_OBRAS_URL: 'http://localhost:8081',
};

describe('leerConfiguracion', () => {
  it('lee las variables de desarrollo', () => {
    expect(leerConfiguracion(entornoValido)).toEqual({
      keycloakUrl: 'http://localhost:8080',
      realm: 'supervision',
      clientId: 'portal',
      obrasUrl: 'http://localhost:8081',
    });
  });

  it('quita la barra final de las URL', () => {
    const configuracion = leerConfiguracion({
      ...entornoValido,
      VITE_KEYCLOAK_URL: 'http://localhost:8080/',
      VITE_OBRAS_URL: 'http://localhost:8081/',
    });
    expect(configuracion.keycloakUrl).toBe('http://localhost:8080');
    expect(configuracion.obrasUrl).toBe('http://localhost:8081');
  });

  it('falla diciendo qué variable falta', () => {
    const { VITE_KEYCLOAK_REALM: _sinRealm, ...incompleto } = entornoValido;
    expect(() => leerConfiguracion(incompleto)).toThrow(/VITE_KEYCLOAK_REALM/);
  });

  it('falla si una URL no es válida', () => {
    expect(() => leerConfiguracion({ ...entornoValido, VITE_KEYCLOAK_URL: 'localhost:8080' })).toThrow(
      /VITE_KEYCLOAK_URL/,
    );
    expect(() => leerConfiguracion({ ...entornoValido, VITE_OBRAS_URL: '' })).toThrow(/VITE_OBRAS_URL/);
  });
});
