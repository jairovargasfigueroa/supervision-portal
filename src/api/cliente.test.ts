import { describe, expect, it, vi } from 'vitest';
import { crearClienteObras, debeReintentar, ErrorApi, esErrorCon } from './cliente';

function respuestaJson(estado: number, cuerpo: unknown, tipo = 'application/json') {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': tipo },
  });
}

function clienteCon(fetchSimulado: typeof fetch, opciones: { token?: string | null; tiempoMaximoMs?: number } = {}) {
  const token = opciones.token === null ? undefined : (opciones.token ?? 'token-de-prueba');
  return crearClienteObras({
    urlBase: 'http://localhost:8081',
    obtenerToken: () => token,
    fetch: fetchSimulado,
    tiempoMaximoMs: opciones.tiempoMaximoMs,
  });
}

/** Encabezados de la llamada `i` al fetch simulado. */
function encabezados(simulado: { mock: { calls: Parameters<typeof fetch>[] } }, i = 0): Record<string, string> {
  return (simulado.mock.calls[i]?.[1]?.headers ?? {}) as Record<string, string>;
}

async function errorDe(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorApi) return error;
    throw error;
  }
  throw new Error('Se esperaba un error');
}

describe('crearClienteObras', () => {
  it('llama a Obras con el token de la sesión y devuelve el JSON', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => respuestaJson(200, [{ id: 'o1' }]));
    const datos = await clienteCon(fetchSimulado).get('/obras');
    expect(datos).toEqual([{ id: 'o1' }]);
    const [url, init] = fetchSimulado.mock.calls[0]!;
    expect(url).toBe('http://localhost:8081/obras');
    expect(init?.method).toBe('GET');
    expect(encabezados(fetchSimulado)['Authorization']).toBe('Bearer token-de-prueba');
    expect(init?.body).toBeUndefined();
  });

  it('usa el token vigente en cada pedido', async () => {
    let token = 'primero';
    const fetchSimulado = vi.fn<typeof fetch>(async () => respuestaJson(200, {}));
    const cliente = crearClienteObras({ urlBase: 'http://obras', obtenerToken: () => token, fetch: fetchSimulado });
    await cliente.get('/a');
    token = 'renovado';
    await cliente.get('/b');
    const autorizacion = (i: number) => encabezados(fetchSimulado, i)['Authorization'];
    expect(autorizacion(0)).toBe('Bearer primero');
    expect(autorizacion(1)).toBe('Bearer renovado');
  });

  it('envía el cuerpo en JSON en un POST y acepta el 202', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => respuestaJson(202, { estado: 'APROBANDO' }));
    const cliente = clienteCon(fetchSimulado);
    expect(await cliente.post('/planillas/p1/aprobar')).toEqual({ estado: 'APROBANDO' });
    await cliente.post('/planillas/p1/observar', { motivo: 'Falta medir el muro' });
    const init = fetchSimulado.mock.calls[1]![1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ motivo: 'Falta medir el muro' }));
    expect(encabezados(fetchSimulado, 1)['Content-Type']).toBe('application/json');
    expect(fetchSimulado.mock.calls[0]![1]!.body).toBeUndefined();
  });

  it('convierte un Problem Details en ErrorApi con su código y sus errores por campo', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () =>
      respuestaJson(
        422,
        {
          type: 'about:blank',
          title: 'Motivo inválido',
          status: 422,
          detail: 'El motivo debe tener entre 10 y 500 caracteres',
          codigo: 'MOTIVO_INVALIDO',
          errores: [{ campo: 'motivo', mensaje: 'Mínimo 10 caracteres' }, { otro: 1 }],
        },
        'application/problem+json',
      ),
    );
    const error = await errorDe(clienteCon(fetchSimulado).post('/planillas/p1/observar', { motivo: 'corto' }));
    expect(error.tipo).toBe('respuesta');
    expect(error.estado).toBe(422);
    expect(error.codigo).toBe('MOTIVO_INVALIDO');
    expect(error.errores).toEqual([{ campo: 'motivo', mensaje: 'Mínimo 10 caracteres' }]);
    expect(esErrorCon(error, 'MOTIVO_INVALIDO')).toBe(true);
  });

  it('sin código en el cuerpo usa el genérico de su estado', async () => {
    const error = await errorDe(clienteCon(async () => new Response('caído', { status: 503 })).get('/obras/o1/fotos'));
    expect(error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
    const sinCodigo = await errorDe(clienteCon(async () => respuestaJson(409, { title: 'x' })).get('/x'));
    expect(sinCodigo.estado).toBe(409);
    expect(sinCodigo.codigo).toBeUndefined();
  });

  it('una falla de conexión es un error de red', async () => {
    const error = await errorDe(clienteCon(async () => Promise.reject(new TypeError('Failed to fetch'))).get('/obras'));
    expect(error.tipo).toBe('red');
    expect(error.estado).toBeNull();
  });

  it('si Obras no responde a tiempo, es un error de tiempo', async () => {
    const colgado: typeof fetch = (_url, init) =>
      new Promise((_resolver, rechazar) => {
        init?.signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
      });
    const error = await errorDe(clienteCon(colgado, { tiempoMaximoMs: 10 }).get('/obras'));
    expect(error.tipo).toBe('tiempo');
  });

  it('si TanStack Query cancela el pedido, deja pasar la cancelación', async () => {
    const colgado: typeof fetch = (_url, init) =>
      new Promise((_resolver, rechazar) => {
        init?.signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
      });
    const control = new AbortController();
    const promesa = clienteCon(colgado).get('/obras', { signal: control.signal });
    control.abort();
    await expect(promesa).rejects.toBeInstanceOf(DOMException);
  });

  it('sin sesión no envía Authorization', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => respuestaJson(200, []));
    await clienteCon(fetchSimulado, { token: null }).get('/obras');
    expect(encabezados(fetchSimulado)['Authorization']).toBeUndefined();
  });
});

describe('debeReintentar', () => {
  it('reintenta fallas de red, de tiempo y 5xx hasta 2 veces', () => {
    expect(debeReintentar(0, new ErrorApi({ tipo: 'red' }))).toBe(true);
    expect(debeReintentar(1, new ErrorApi({ tipo: 'tiempo' }))).toBe(true);
    expect(debeReintentar(0, new ErrorApi({ tipo: 'respuesta', estado: 503 }))).toBe(true);
    expect(debeReintentar(2, new ErrorApi({ tipo: 'red' }))).toBe(false);
  });

  it('no reintenta un 4xx', () => {
    expect(debeReintentar(0, new ErrorApi({ tipo: 'respuesta', estado: 404, codigo: 'OBRA_NO_ENCONTRADA' }))).toBe(false);
    expect(debeReintentar(0, new ErrorApi({ tipo: 'respuesta', estado: 401 }))).toBe(false);
  });
});
