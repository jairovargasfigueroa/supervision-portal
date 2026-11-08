import { describe, expect, it } from 'vitest';
import {
  cargarConfiguracion,
  ENTORNO_DESARROLLO,
  entornoPublicado,
  esDesarrollo,
  leerConfiguracion,
} from './configuracion';

const entornoValido = {
  VITE_KEYCLOAK_URL: 'http://localhost:8080',
  VITE_KEYCLOAK_REALM: 'supervision',
  VITE_KEYCLOAK_CLIENT_ID: 'portal',
  VITE_OBRAS_URL: 'http://localhost:8081',
};

const configuracionDesarrollo = {
  keycloakUrl: 'http://localhost:8080',
  realm: 'supervision',
  clientId: 'portal',
  obrasUrl: 'http://localhost:8081',
  erpUrl: 'http://localhost:4200',
};

const publicada = {
  keycloakUrl: 'https://keycloak.azure.localhost:8443',
  keycloakRealm: 'supervision',
  obrasUrl: 'https://obras.azure.localhost:8443',
  erpUrl: 'https://erp.azure.localhost:8443',
};

const respuestaJson = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

describe('leerConfiguracion', () => {
  it('lee las variables de desarrollo', () => {
    expect(leerConfiguracion(entornoValido)).toEqual(configuracionDesarrollo);
  });

  it('quita la barra final de las URL', () => {
    const configuracion = leerConfiguracion({
      ...entornoValido,
      VITE_KEYCLOAK_URL: 'http://localhost:8080/',
      VITE_OBRAS_URL: 'http://localhost:8081/',
      VITE_ERP_URL: 'http://localhost:4200/',
    });
    expect(configuracion.keycloakUrl).toBe('http://localhost:8080');
    expect(configuracion.obrasUrl).toBe('http://localhost:8081');
    expect(configuracion.erpUrl).toBe('http://localhost:4200');
  });

  it('usa el valor de desarrollo de la variable que falta (601)', () => {
    const { VITE_KEYCLOAK_REALM: _sinRealm, ...incompleto } = entornoValido;
    expect(leerConfiguracion(incompleto)).toEqual(configuracionDesarrollo);
    expect(leerConfiguracion({})).toEqual(configuracionDesarrollo);
  });

  it('falla diciendo qué variable no es válida', () => {
    expect(() => leerConfiguracion({ ...entornoValido, VITE_KEYCLOAK_URL: 'localhost:8080' })).toThrow(
      /VITE_KEYCLOAK_URL/,
    );
    expect(() => leerConfiguracion({ ...entornoValido, VITE_OBRAS_URL: '' })).toThrow(/VITE_OBRAS_URL/);
    expect(() => leerConfiguracion({ ...entornoValido, VITE_KEYCLOAK_REALM: '  ' })).toThrow(/VITE_KEYCLOAK_REALM/);
  });

  it('los valores de desarrollo son los de .env.example', () => {
    expect(ENTORNO_DESARROLLO).toEqual({ ...entornoValido, VITE_ERP_URL: 'http://localhost:4200' });
  });
});

describe('entornoPublicado', () => {
  it('pasa los campos de configuracion.json a sus variables e ignora lo vacío, lo que no es texto y lo desconocido', () => {
    expect(entornoPublicado({ ...publicada, keycloakRealm: ' ', erpUrl: 4, otro: 'x' })).toEqual({
      VITE_KEYCLOAK_URL: publicada.keycloakUrl,
      VITE_OBRAS_URL: publicada.obrasUrl,
    });
    expect(entornoPublicado(null)).toEqual({});
    expect(entornoPublicado(['x'])).toEqual({});
  });
});

describe('cargarConfiguracion (601)', () => {
  it('lee configuracion.json sin caché y manda sobre .env', async () => {
    const pedidos: [RequestInfo | URL, RequestInit | undefined][] = [];

    const configuracion = await cargarConfiguracion(entornoValido, async (entrada, opciones) => {
      pedidos.push([entrada, opciones]);
      return respuestaJson(publicada);
    });

    expect(pedidos).toEqual([['/configuracion.json', { cache: 'no-cache' }]]);
    expect(configuracion).toEqual({
      keycloakUrl: publicada.keycloakUrl,
      realm: 'supervision',
      clientId: 'portal',
      obrasUrl: publicada.obrasUrl,
      erpUrl: publicada.erpUrl,
    });
  });

  it('compilado sin .env, toma todo de configuracion.json (el cliente sigue siendo portal)', async () => {
    const configuracion = await cargarConfiguracion({}, async () => respuestaJson(publicada));

    expect(configuracion.keycloakUrl).toBe(publicada.keycloakUrl);
    expect(configuracion.obrasUrl).toBe(publicada.obrasUrl);
    expect(configuracion.clientId).toBe('portal');
  });

  it('sin configuracion.json (404) usa .env', async () => {
    const configuracion = await cargarConfiguracion(
      { ...entornoValido, VITE_OBRAS_URL: 'http://127.0.0.1:8081' },
      async () => new Response('No encontrado', { status: 404 }),
    );

    expect(configuracion).toEqual({ ...configuracionDesarrollo, obrasUrl: 'http://127.0.0.1:8081' });
  });

  it('si el servidor de desarrollo devuelve index.html o la red falla, usa .env y los valores de desarrollo', async () => {
    const conHtml = await cargarConfiguracion(
      { VITE_KEYCLOAK_URL: '' },
      async () => new Response('<!doctype html><html></html>', { status: 200 }),
    );
    const sinRed = await cargarConfiguracion({}, async () => {
      throw new TypeError('Failed to fetch');
    });

    expect(conHtml).toEqual(configuracionDesarrollo);
    expect(sinRed).toEqual(configuracionDesarrollo);
  });

  it('rechaza si configuracion.json trae una dirección no válida', async () => {
    await expect(
      cargarConfiguracion(entornoValido, async () => respuestaJson({ ...publicada, obrasUrl: 'obras' })),
    ).rejects.toThrow(/VITE_OBRAS_URL/);
  });
});

describe('compilación publicada (601)', () => {
  it('es desarrollo con vite o con la versión compilada en localhost, no en una publicación', () => {
    expect(esDesarrollo(true, 'portal.azure.localhost')).toBe(true);
    expect(esDesarrollo(false, 'localhost')).toBe(true);
    expect(esDesarrollo(false, '127.0.0.1')).toBe(true);
    expect(esDesarrollo(false, 'portal.azure.localhost')).toBe(false);
  });

  it('toma todo de configuracion.json e ignora .env (el cliente sigue siendo portal)', async () => {
    const configuracion = await cargarConfiguracion(
      { ...entornoValido, VITE_ERP_URL: 'http://localhost:4200' },
      async () => respuestaJson(publicada),
      false,
    );

    expect(configuracion).toEqual({
      keycloakUrl: publicada.keycloakUrl,
      realm: 'supervision',
      clientId: 'portal',
      obrasUrl: publicada.obrasUrl,
      erpUrl: publicada.erpUrl,
    });
  });

  it('rechaza sin el archivo, si no es JSON o si le falta un campo (nunca usa .env ni localhost)', async () => {
    await expect(
      cargarConfiguracion(entornoValido, async () => new Response('No encontrado', { status: 404 }), false),
    ).rejects.toThrow(/respondió 404/);
    await expect(
      cargarConfiguracion(entornoValido, async () => new Response('<!doctype html><html></html>', { status: 200 }), false),
    ).rejects.toThrow(/no es JSON/);
    const { erpUrl: _sinErp, ...incompleta } = publicada;
    await expect(cargarConfiguracion(entornoValido, async () => respuestaJson(incompleta), false)).rejects.toThrow(
      /VITE_ERP_URL/,
    );
  });
});

