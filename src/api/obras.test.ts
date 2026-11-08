import { describe, expect, it, vi } from 'vitest';
import { crearClienteObras } from './cliente';
import { listarFotos, listarFotosPorId } from './obras';
import { aprobarPlanilla, observarPlanilla, obtenerPlanilla } from './planillas';

const OBRA = 'b0000000-0000-4000-8000-000000000001';

function foto(n: number) {
  return {
    id: `f-${n}`,
    partidaId: 'p1',
    registradoPor: 'u1',
    registradoEn: '2027-03-10T15:00:00Z',
    publicadaCliente: true,
    urlDescarga: `https://s3/f-${n}.jpg`,
  };
}

/** Obras simulado con `total` fotos publicadas, paginadas como en el contrato. */
function obrasConFotos(total: number) {
  const todas = Array.from({ length: total }, (_, i) => foto(i + 1));
  return vi.fn<typeof fetch>(async (entrada) => {
    const url = new URL(String(entrada));
    const pagina = Number(url.searchParams.get('pagina'));
    const tamano = Number(url.searchParams.get('tamano'));
    const items = todas.slice((pagina - 1) * tamano, pagina * tamano);
    return new Response(JSON.stringify({ items, total, pagina, tamano }), { status: 200 });
  });
}

const clienteCon = (fetchSimulado: typeof fetch) =>
  crearClienteObras({ urlBase: 'http://localhost:8081', obtenerToken: () => 't', fetch: fetchSimulado });

describe('fotos', () => {
  it('pide la página y el tamaño de la galería', async () => {
    const fetchSimulado = obrasConFotos(3);
    const resultado = await listarFotos(clienteCon(fetchSimulado), OBRA, 1, 20);
    expect(resultado.items).toHaveLength(3);
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`http://localhost:8081/obras/${OBRA}/fotos?pagina=1&tamano=20`);
  });

  it('busca las fotos de respaldo por id recorriendo las páginas y respeta el orden de la planilla', async () => {
    const fetchSimulado = obrasConFotos(230);
    const fotos = await listarFotosPorId(clienteCon(fetchSimulado), OBRA, ['f-150', 'f-2']);
    expect(fotos.map((f) => f.id)).toEqual(['f-150', 'f-2']);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it('termina al acabarse la lista aunque falte alguna foto', async () => {
    const fetchSimulado = obrasConFotos(5);
    const fotos = await listarFotosPorId(clienteCon(fetchSimulado), OBRA, ['f-1', 'no-existe']);
    expect(fotos.map((f) => f.id)).toEqual(['f-1']);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('sin fotos de respaldo no llama a Obras', async () => {
    const fetchSimulado = obrasConFotos(5);
    expect(await listarFotosPorId(clienteCon(fetchSimulado), OBRA, [])).toEqual([]);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe('planillas', () => {
  it('usa las rutas del contrato', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    const cliente = clienteCon(fetchSimulado);
    await obtenerPlanilla(cliente, 'p1');
    await aprobarPlanilla(cliente, 'p1');
    await observarPlanilla(cliente, 'p1', 'La medición no coincide');
    const llamadas = fetchSimulado.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);
    expect(llamadas).toEqual([
      'GET http://localhost:8081/planillas/p1',
      'POST http://localhost:8081/planillas/p1/aprobar',
      'POST http://localhost:8081/planillas/p1/observar',
    ]);
    expect(fetchSimulado.mock.calls[2]![1]!.body).toBe('{"motivo":"La medición no coincide"}');
  });
});
