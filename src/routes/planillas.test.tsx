import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  conSesionCliente,
  foto,
  montarPortal,
  OBRA_1,
  obraDetalle,
  PLANILLA_103,
  planillaDetalle,
  problema,
  type ManejadorObras,
  type RespuestaSimulada,
} from '../pruebas/portalSimulado';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn(), hasAuthParams: vi.fn(() => false) }));

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  conSesionCliente(vi.mocked(useAuth));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const RUTA = `/planillas/${PLANILLA_103}`;

/**
 * Obras simulado para una planilla. `planilla` da la respuesta de cada GET de la planilla (se llama en cada consulta);
 * `extra` atiende el resto (aprobar, observar, fotos…).
 */
function obras(planilla: () => RespuestaSimulada, extra: ManejadorObras = () => problema(404, 'RUTA_NO_ENCONTRADA')): ManejadorObras {
  return (metodo, ruta, cuerpo) => {
    if (metodo === 'GET' && ruta === RUTA) return planilla();
    if (metodo === 'GET' && ruta === `/obras/${OBRA_1}`) return { estado: 200, cuerpo: obraDetalle };
    if (metodo === 'GET' && ruta.startsWith(`/obras/${OBRA_1}/fotos?`))
      return { estado: 200, cuerpo: { items: [foto(2), foto(1)], total: 2, pagina: 1, tamano: 100 } };
    return extra(metodo, ruta, cuerpo);
  };
}

const presentada = () => ({ estado: 200, cuerpo: planillaDetalle('PRESENTADA') });
const consultasDePlanilla = (llamadas: { metodo: string; ruta: string }[]) =>
  llamadas.filter((llamada) => llamada.metodo === 'GET' && llamada.ruta === RUTA).length;

describe('Detalle de planilla presentada (criterio 3)', () => {
  it('muestra líneas, totales, fotos de respaldo y los botones «Aprobar» y «Observar»', async () => {
    montarPortal(RUTA, obras(presentada));
    expect(await screen.findByRole('heading', { name: 'Planilla N.º 3' })).toBeTruthy();
    expect(screen.getByText('Presentada')).toBeTruthy();
    expect(screen.getByText('Periodo: Octubre 2026')).toBeTruthy();

    const tabla = screen.getByRole('table', { name: 'Líneas de la planilla' });
    const fila = within(tabla).getByText('P-03 Cimientos de hormigón').closest('tr')!;
    expect(within(fila).getByText('120 m³')).toBeTruthy();
    expect(within(fila).getByText('Bs 50.460,00')).toBeTruthy();
    expect(within(fila).getByText('Bs 420,50')).toBeTruthy();

    const totales = screen.getByLabelText('Totales');
    expect(within(totales).getByText('Subtotal')).toBeTruthy();
    expect(within(totales).getByText('(−) Anticipo 10 %')).toBeTruthy();
    expect(within(totales).getByText('− Bs 5.046,00')).toBeTruthy();
    expect(within(totales).getByText('(−) Retención 7 %')).toBeTruthy();
    expect(within(totales).getByText('− Bs 3.532,20')).toBeTruthy();
    expect(within(totales).getByText('Neto a pagar')).toBeTruthy();
    expect(within(totales).getByText('Bs 41.881,80')).toBeTruthy();

    // Solo la foto adjunta a la planilla (fotoIds), no las demás publicadas de la obra.
    const fotos = await screen.findByRole('list', { name: 'Fotos' });
    expect(within(fotos).getAllByRole('img')).toHaveLength(1);
    expect(within(fotos).getByRole('img').getAttribute('src')).toBe(foto(1).urlDescarga);

    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Observar' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Edificio Residencial Las Palmeras' })).toBeTruthy();
  });

  it('si las fotos no están disponibles (503), solo esa sección muestra el error', async () => {
    montarPortal(RUTA, (metodo, ruta, cuerpo) =>
      ruta.startsWith(`/obras/${OBRA_1}/fotos?`) ? problema(503, 'SERVICIO_NO_DISPONIBLE') : obras(presentada)(metodo, ruta, cuerpo),
    );
    const seccion = await screen.findByRole('region', { name: 'Fotos de respaldo' });
    expect(await within(seccion).findByText('No disponible por el momento.')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Líneas de la planilla' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeTruthy();
  });

  it('sin fotos de respaldo lo dice y no pide fotos', async () => {
    const { llamadas } = montarPortal(RUTA, obras(() => ({ estado: 200, cuerpo: planillaDetalle('PRESENTADA', { fotoIds: [] }) })));
    expect(await screen.findByText('Esta planilla no tiene fotos de respaldo.')).toBeTruthy();
    expect(llamadas.some((llamada) => llamada.ruta.includes('/fotos'))).toBe(false);
  });

  it('una planilla aprobada u observada no ofrece «Aprobar» ni «Observar»', async () => {
    montarPortal(RUTA, obras(() => ({ estado: 200, cuerpo: planillaDetalle('APROBADA', { cobroNumero: 'COB-2026-0003' }) })));
    expect(await screen.findByText('Planilla aprobada')).toBeTruthy();
    expect(screen.getByText('COB-2026-0003')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Observar' })).toBeNull();
  });

  it('una planilla que no existe, es de otra obra o es un borrador es «Planilla no encontrada»', async () => {
    montarPortal(RUTA, obras(() => problema(404, 'PLANILLA_NO_ENCONTRADA')));
    expect(await screen.findByText('Planilla no encontrada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver a mis obras' })).toBeTruthy();
  });
});

describe('Aprobar (criterios 5 y 6)', () => {
  /** Planilla que pasa a APROBANDO al aprobar y luego a `final` después de `consultasHastaFinal` consultas. */
  function saga(final: RespuestaSimulada | null, consultasHastaFinal = 1) {
    let estado: 'PRESENTADA' | 'APROBANDO' = 'PRESENTADA';
    let consultasAprobando = 0;
    const aprobar = vi.fn(() => {
      estado = 'APROBANDO';
      return { estado: 202, cuerpo: { estado: 'APROBANDO' } };
    });
    const planilla = () => {
      if (estado === 'PRESENTADA') return presentada();
      consultasAprobando++;
      if (final && consultasAprobando > consultasHastaFinal) return final;
      return { estado: 200, cuerpo: planillaDetalle('APROBANDO') };
    };
    const manejador = obras(planilla, (metodo, ruta) =>
      metodo === 'POST' && ruta === `${RUTA}/aprobar` ? aprobar() : problema(404, 'RUTA_NO_ENCONTRADA'),
    );
    return { manejador, aprobar };
  }

  async function confirmarAprobacion() {
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Aprobar planilla' });
    expect(within(dialogo).getByText('¿Aprobar la planilla N.º 3 por Bs 41.881,80? Se emitirá el cobro.')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));
  }

  it('pide confirmación; «Cancelar» no aprueba', async () => {
    const { manejador, aprobar } = saga(null);
    montarPortal(RUTA, manejador);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Aprobar planilla' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(aprobar).not.toHaveBeenCalled();
  });

  it('muestra «En aprobación…», consulta cada 2 s y termina APROBADA con el número de cobro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { manejador, aprobar } = saga(
      { estado: 200, cuerpo: planillaDetalle('APROBADA', { cobroId: 'c', cobroNumero: 'COB-2026-0003' }) },
      2,
    );
    const { llamadas } = montarPortal(RUTA, manejador);
    await confirmarAprobacion();

    expect(await screen.findByText('En aprobación…')).toBeTruthy();
    expect(aprobar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Observar' })).toBeNull();
    const antes = consultasDePlanilla(llamadas);

    await act(() => vi.advanceTimersByTimeAsync(2_000));
    await waitFor(() => expect(consultasDePlanilla(llamadas)).toBe(antes + 1));
    expect(screen.getByText('En aprobación…')).toBeTruthy();

    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(await screen.findByText('Planilla aprobada')).toBeTruthy();
    expect(screen.getByText('COB-2026-0003')).toBeTruthy();
    expect(screen.queryByText('En aprobación…')).toBeNull();

    // Ya no se consulta.
    const alTerminar = consultasDePlanilla(llamadas);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(consultasDePlanilla(llamadas)).toBe(alTerminar);
  });

  it('si la saga falla, queda OBSERVADA con el motivo del fallo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { manejador } = saga({
      estado: 200,
      cuerpo: planillaDetalle('OBSERVADA', { observacion: 'Saldo del contrato insuficiente' }),
    });
    montarPortal(RUTA, manejador);
    await confirmarAprobacion();
    expect(await screen.findByText('En aprobación…')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(await screen.findByText('Planilla observada')).toBeTruthy();
    expect(screen.getByText('Saldo del contrato insuficiente')).toBeTruthy();
  });

  it('a los 90 s avisa que tarda y a los 4 minutos deja de consultar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { manejador } = saga(null);
    const { llamadas } = montarPortal(RUTA, manejador);
    await confirmarAprobacion();
    expect(await screen.findByText('En aprobación…')).toBeTruthy();

    const aviso = 'La aprobación está tardando más de lo normal; puedes cerrar esta pantalla, el resultado aparecerá aquí';
    await act(() => vi.advanceTimersByTimeAsync(88_000));
    expect(screen.queryByText(aviso)).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(await screen.findByText(aviso)).toBeTruthy();
    expect(screen.getByText('En aprobación…')).toBeTruthy();
    expect(consultasDePlanilla(llamadas)).toBeGreaterThan(40);

    await act(() => vi.advanceTimersByTimeAsync(150_000));
    const alAgotarse = consultasDePlanilla(llamadas);
    expect(alAgotarse).toBeLessThanOrEqual(122);
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(consultasDePlanilla(llamadas)).toBe(alAgotarse);
    expect(screen.getByText(aviso)).toBeTruthy();

    // «Actualizar» vuelve a consultar.
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(consultasDePlanilla(llamadas)).toBe(alAgotarse + 1));
  });

  it('al abrir una planilla que ya está APROBANDO también espera el resultado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let consultas = 0;
    montarPortal(
      RUTA,
      obras(() =>
        ++consultas < 3
          ? { estado: 200, cuerpo: planillaDetalle('APROBANDO') }
          : { estado: 200, cuerpo: planillaDetalle('APROBADA', { cobroNumero: 'COB-2026-0003' }) },
      ),
    );
    expect(await screen.findByText('En aprobación…')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(await screen.findByText('Planilla aprobada')).toBeTruthy();
  });

  it('si la planilla ya no estaba presentada (409), lo dice y vuelve a pedir su estado', async () => {
    let estado = 'PRESENTADA';
    const { llamadas } = montarPortal(
      RUTA,
      obras(
        () => ({ estado: 200, cuerpo: planillaDetalle(estado, estado === 'OBSERVADA' ? { observacion: 'Motivo de otra persona' } : {}) }),
        (metodo, ruta) => {
          if (metodo === 'POST' && ruta === `${RUTA}/aprobar`) {
            estado = 'OBSERVADA';
            return problema(409, 'PLANILLA_NO_PRESENTADA');
          }
          return problema(404, 'RUTA_NO_ENCONTRADA');
        },
      ),
    );
    await confirmarAprobacion();
    const dialogo = screen.getByRole('dialog', { name: 'Aprobar planilla' });
    expect(
      await within(dialogo).findByText('Esta planilla ya no está esperando tu revisión. Recarga para ver su estado actual.'),
    ).toBeTruthy();
    expect(await screen.findByText('Motivo de otra persona')).toBeTruthy();
    expect(consultasDePlanilla(llamadas)).toBe(2);
  });
});

describe('Observar (criterio 4)', () => {
  it('exige un motivo de 10 a 500 caracteres, muestra el contador y pasa la planilla a OBSERVADA', async () => {
    let estado = 'PRESENTADA';
    const motivo = 'La medición de columnas no coincide con lo verificado en la visita.';
    const observar = vi.fn((cuerpo: unknown) => {
      estado = 'OBSERVADA';
      return { estado: 200, cuerpo: planillaDetalle('OBSERVADA', { observacion: (cuerpo as { motivo: string }).motivo }) };
    });
    const { llamadas } = montarPortal(
      RUTA,
      obras(
        () => ({ estado: 200, cuerpo: planillaDetalle(estado, estado === 'OBSERVADA' ? { observacion: motivo } : {}) }),
        (metodo, ruta, cuerpo) =>
          metodo === 'POST' && ruta === `${RUTA}/observar` ? observar(cuerpo) : problema(404, 'RUTA_NO_ENCONTRADA'),
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Observar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Observar planilla N.º 3' });
    const campo = within(dialogo).getByRole('textbox', { name: /Motivo/ });
    expect(within(dialogo).getByText('0 / 500')).toBeTruthy();

    // Vacío: no envía y muestra la regla.
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(await within(dialogo).findByText('El motivo debe tener entre 10 y 500 caracteres.')).toBeTruthy();

    fireEvent.change(campo, { target: { value: 'Muy corto' } });
    expect(within(dialogo).getByText('9 / 500')).toBeTruthy();
    expect(within(dialogo).getByText('El motivo debe tener entre 10 y 500 caracteres.')).toBeTruthy();

    fireEvent.change(campo, { target: { value: 'x'.repeat(501) } });
    expect(within(dialogo).getByText('501 / 500')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(observar).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: `  ${motivo}  ` } });
    await waitFor(() => expect(within(dialogo).queryByText('El motivo debe tener entre 10 y 500 caracteres.')).toBeNull());
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));

    await waitFor(() => expect(observar).toHaveBeenCalledTimes(1));
    expect(llamadas.find((llamada) => llamada.metodo === 'POST')?.cuerpo).toEqual({ motivo });
    expect(await screen.findByText('Planilla observada')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(motivo)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
  });

  it('si Obras rechaza el motivo (422), muestra el mensaje junto al campo', async () => {
    montarPortal(
      RUTA,
      obras(presentada, () => ({
        estado: 422,
        cuerpo: { status: 422, codigo: 'MOTIVO_INVALIDO', errores: [{ campo: 'motivo', mensaje: 'Debe tener al menos 10 caracteres' }] },
      })),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Observar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Observar planilla N.º 3' });
    fireEvent.change(within(dialogo).getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Un motivo suficientemente largo' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(await within(dialogo).findByText('El motivo debe tener entre 10 y 500 caracteres.')).toBeTruthy();
    expect(within(dialogo).getByText('Debe tener al menos 10 caracteres')).toBeTruthy();
  });
});
