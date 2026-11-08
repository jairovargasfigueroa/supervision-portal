import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  conSesionCliente,
  foto,
  montarPortal,
  OBRA_1,
  obraDetalle,
  obraResumen,
  PLANILLA_103,
  planillasDeObra,
  problema,
  type ManejadorObras,
} from '../pruebas/portalSimulado';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn(), hasAuthParams: vi.fn(() => false) }));

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  conSesionCliente(vi.mocked(useAuth));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Obras simulado con la obra 1 del cliente; `cambios` reemplaza la respuesta de una ruta. */
function obras(cambios: Record<string, ReturnType<ManejadorObras>> = {}): ManejadorObras {
  return (metodo, ruta) => {
    if (cambios[ruta]) return cambios[ruta];
    if (metodo === 'GET' && ruta === '/obras') return { estado: 200, cuerpo: [obraResumen] };
    if (metodo === 'GET' && ruta === `/obras/${OBRA_1}`) return { estado: 200, cuerpo: obraDetalle };
    if (metodo === 'GET' && ruta === `/obras/${OBRA_1}/planillas`) return { estado: 200, cuerpo: planillasDeObra };
    if (metodo === 'GET' && ruta.startsWith(`/obras/${OBRA_1}/fotos?`))
      return { estado: 200, cuerpo: { items: [foto(1), foto(2)], total: 2, pagina: 1, tamano: 20 } };
    return problema(404, 'RUTA_NO_ENCONTRADA');
  };
}

describe('Mis obras', () => {
  it('muestra cada obra con nombre, ubicación, avance y plazo (criterio 1)', async () => {
    const { llamadas } = montarPortal('/', obras());
    const obrasLista = await screen.findByRole('list', { name: 'Obras' });
    expect(within(obrasLista).getByText('Edificio Residencial Las Palmeras')).toBeTruthy();
    expect(within(obrasLista).getByText('Av. Banzer 4to anillo, Santa Cruz')).toBeTruthy();
    expect(within(obrasLista).getByText('28,5 %')).toBeTruthy();
    expect(within(obrasLista).getByText('38,6 %')).toBeTruthy();
    expect(within(obrasLista).getByRole('progressbar', { name: 'Avance físico' })).toBeTruthy();
    expect(within(obrasLista).getByRole('progressbar', { name: 'Plazo transcurrido' })).toBeTruthy();
    expect(llamadas[0]).toMatchObject({ metodo: 'GET', ruta: '/obras' });
  });

  it('sin obras muestra el estado vacío', async () => {
    montarPortal('/', obras({ '/obras': { estado: 200, cuerpo: [] } }));
    expect(await screen.findByText('Aún no hay obras para mostrar.')).toBeTruthy();
  });

  it('si Obras falla muestra el error y reintenta', async () => {
    let fallar = true;
    const manejador = obras();
    montarPortal('/', (metodo, ruta, cuerpo) =>
      ruta === '/obras' && fallar ? problema(503, 'SERVICIO_NO_DISPONIBLE') : manejador(metodo, ruta, cuerpo),
    );
    expect(
      await screen.findByText('Este servicio no está disponible por el momento. Intenta de nuevo en unos minutos.'),
    ).toBeTruthy();
    fallar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Edificio Residencial Las Palmeras')).toBeTruthy();
  });

  it('al pulsar una obra abre su detalle', async () => {
    const { router } = montarPortal('/', obras());
    fireEvent.click(await screen.findByRole('link', { name: /Edificio Residencial Las Palmeras/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/obras/${OBRA_1}`));
  });
});

describe('Detalle de obra', () => {
  it('muestra el avance por partida, las planillas sin borradores y las fotos publicadas (criterio 2)', async () => {
    const { llamadas } = montarPortal(
      `/obras/${OBRA_1}`,
      obras({
        [`/obras/${OBRA_1}/planillas`]: {
          estado: 200,
          cuerpo: [...planillasDeObra, { ...planillasDeObra[0], id: 'borrador', numero: 4, estado: 'BORRADOR' }],
        },
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Edificio Residencial Las Palmeras' })).toBeTruthy();

    const tabla = screen.getByRole('table', { name: 'Avance por partida' });
    for (const encabezado of ['Código', 'Partida', 'Unidad', 'Contratado', 'Ejecutado acumulado', 'Avance'])
      expect(within(tabla).getByRole('columnheader', { name: encabezado })).toBeTruthy();
    const fila = within(tabla).getByText('Cimientos de hormigón').closest('tr')!;
    expect(within(fila).getByText('P-03')).toBeTruthy();
    expect(within(fila).getByText('140 m³')).toBeTruthy();
    expect(within(fila).getByText('50 m³')).toBeTruthy();
    expect(within(fila).getByText('35,7 %')).toBeTruthy();

    const planillas = await screen.findByRole('list', { name: 'Planillas' });
    const tarjetas = within(planillas).getAllByRole('listitem');
    expect(tarjetas).toHaveLength(2);
    expect(within(tarjetas[0]!).getByText('Planilla N.º 3')).toBeTruthy();
    expect(within(tarjetas[0]!).getByText('Presentada')).toBeTruthy();
    expect(within(tarjetas[0]!).getByText('Octubre 2026')).toBeTruthy();
    expect(within(tarjetas[0]!).getByText('Bs 41.881,80')).toBeTruthy();
    expect(within(tarjetas[1]!).getByText('Aprobada')).toBeTruthy();
    expect(within(tarjetas[1]!).getByText('Agosto 2026 · Cobro COB-2026-0001')).toBeTruthy();
    expect(screen.queryByText('Planilla N.º 4')).toBeNull();

    const fotos = await screen.findByRole('list', { name: 'Fotos' });
    expect(within(fotos).getAllByRole('img')).toHaveLength(2);
    expect(within(fotos).getAllByText('P-03 Cimientos de hormigón · 15/10/2026')).toHaveLength(2);
    expect(llamadas.some((llamada) => llamada.ruta === `/obras/${OBRA_1}/fotos?pagina=1&tamano=20`)).toBe(true);
  });

  it('si las fotos no están disponibles (503), solo esa sección muestra el error', async () => {
    montarPortal(
      `/obras/${OBRA_1}`,
      obras({ [`/obras/${OBRA_1}/fotos?pagina=1&tamano=20`]: problema(503, 'SERVICIO_NO_DISPONIBLE') }),
    );
    const seccionFotos = await screen.findByRole('region', { name: 'Fotos de la obra' });
    expect(await within(seccionFotos).findByText('No disponible por el momento.')).toBeTruthy();
    expect(within(seccionFotos).getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(await screen.findByRole('list', { name: 'Planillas' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Avance por partida' })).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('con más fotos ofrece «Cargar más fotos»', async () => {
    const manejador = obras();
    const { llamadas } = montarPortal(`/obras/${OBRA_1}`, (metodo, ruta, cuerpo) => {
      if (ruta === `/obras/${OBRA_1}/fotos?pagina=1&tamano=20`)
        return { estado: 200, cuerpo: { items: [foto(1)], total: 21, pagina: 1, tamano: 20 } };
      if (ruta === `/obras/${OBRA_1}/fotos?pagina=2&tamano=20`)
        return { estado: 200, cuerpo: { items: [foto(2)], total: 21, pagina: 2, tamano: 20 } };
      return manejador(metodo, ruta, cuerpo);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más fotos' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Fotos' })).getAllByRole('img')).toHaveLength(2));
    expect(llamadas.some((llamada) => llamada.ruta.includes('pagina=2'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Cargar más fotos' })).toBeNull();
  });

  it('sin planillas ni fotos muestra sus estados vacíos', async () => {
    montarPortal(
      `/obras/${OBRA_1}`,
      obras({
        [`/obras/${OBRA_1}/planillas`]: { estado: 200, cuerpo: [] },
        [`/obras/${OBRA_1}/fotos?pagina=1&tamano=20`]: { estado: 200, cuerpo: { items: [], total: 0, pagina: 1, tamano: 20 } },
      }),
    );
    expect(await screen.findByText('Aún no hay planillas.')).toBeTruthy();
    expect(await screen.findByText('Aún no hay fotos de avance.')).toBeTruthy();
  });

  it('una obra que no es del cliente se muestra como «Obra no encontrada»', async () => {
    montarPortal(`/obras/${OBRA_1}`, obras({ [`/obras/${OBRA_1}`]: problema(404, 'OBRA_NO_ENCONTRADA') }));
    expect(await screen.findByText('Obra no encontrada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver a mis obras' })).toBeTruthy();
  });

  it('un id que no es UUID también es «Obra no encontrada»', async () => {
    const { llamadas } = montarPortal('/obras/no-es-un-id', obras());
    expect(await screen.findByText('Obra no encontrada')).toBeTruthy();
    expect(llamadas).toHaveLength(0);
  });

  it('al pulsar una planilla abre su detalle', async () => {
    const { router } = montarPortal(`/obras/${OBRA_1}`, obras());
    fireEvent.click(await screen.findByRole('link', { name: /Planilla N\.º 3/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/planillas/${PLANILLA_103}`));
  });
});
