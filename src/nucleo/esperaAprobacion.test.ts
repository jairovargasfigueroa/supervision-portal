import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVISO_DEMORA_MS, INTERVALO_CONSULTA_MS, LIMITE_ESPERA_MS, useEsperaAprobacion } from './esperaAprobacion';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useEsperaAprobacion', () => {
  it('fuera de APROBANDO no consulta', () => {
    const { result } = renderHook(() => useEsperaAprobacion(false));
    expect(result.current).toMatchObject({ fase: 'normal', intervalo: false });
    act(() => vi.advanceTimersByTime(LIMITE_ESPERA_MS));
    expect(result.current.fase).toBe('normal');
  });

  it('consulta cada 2 s, avisa a los 90 s y deja de consultar a los 4 minutos', () => {
    const { result } = renderHook(() => useEsperaAprobacion(true));
    expect(result.current).toMatchObject({ fase: 'normal', intervalo: INTERVALO_CONSULTA_MS });
    expect(INTERVALO_CONSULTA_MS).toBe(2_000);

    act(() => vi.advanceTimersByTime(AVISO_DEMORA_MS - 1));
    expect(result.current.fase).toBe('normal');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ fase: 'tardando', intervalo: 2_000 });

    act(() => vi.advanceTimersByTime(LIMITE_ESPERA_MS - AVISO_DEMORA_MS));
    expect(result.current).toMatchObject({ fase: 'agotada', intervalo: false });
    expect(LIMITE_ESPERA_MS).toBe(240_000);
  });

  it('al terminar la aprobación vuelve a cero y una nueva espera cuenta desde el principio', () => {
    const { result, rerender } = renderHook(({ aprobando }) => useEsperaAprobacion(aprobando), {
      initialProps: { aprobando: true },
    });
    act(() => vi.advanceTimersByTime(AVISO_DEMORA_MS));
    expect(result.current.fase).toBe('tardando');
    rerender({ aprobando: false });
    expect(result.current).toMatchObject({ fase: 'normal', intervalo: false });
    rerender({ aprobando: true });
    expect(result.current.fase).toBe('normal');
    act(() => vi.advanceTimersByTime(AVISO_DEMORA_MS - 1));
    expect(result.current.fase).toBe('normal');
  });

  it('«reiniciar» vuelve a consultar después de agotarse', () => {
    const { result } = renderHook(() => useEsperaAprobacion(true));
    act(() => vi.advanceTimersByTime(LIMITE_ESPERA_MS));
    expect(result.current.intervalo).toBe(false);
    act(() => result.current.reiniciar());
    expect(result.current).toMatchObject({ fase: 'normal', intervalo: 2_000 });
  });
});
