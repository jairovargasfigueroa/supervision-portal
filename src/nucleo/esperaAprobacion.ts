import { useCallback, useEffect, useState } from 'react';

// Espera de la saga «aprobar planilla» (008, criterio 5): mientras la planilla sigue `APROBANDO` se consulta cada 2 s;
// a los 90 s se avisa que está tardando; a los 4 minutos se deja de consultar (al volver a abrir se ve el estado actual).

export const INTERVALO_CONSULTA_MS = 2_000;
export const AVISO_DEMORA_MS = 90_000;
export const LIMITE_ESPERA_MS = 240_000;

export type FaseEspera = 'normal' | 'tardando' | 'agotada';

export interface EsperaAprobacion {
  fase: FaseEspera;
  /** Intervalo de consulta para TanStack Query (`false`: no consultar). */
  intervalo: number | false;
  /** Vuelve a esperar desde cero (por ejemplo, al pulsar «Actualizar» después de los 4 minutos). */
  reiniciar: () => void;
}

/** Cuenta el tiempo desde que la planilla está `APROBANDO` en esta pantalla. */
export function useEsperaAprobacion(aprobando: boolean): EsperaAprobacion {
  const [fase, setFase] = useState<FaseEspera>('normal');
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (!aprobando) return undefined;
    const aviso = setTimeout(() => setFase('tardando'), AVISO_DEMORA_MS);
    const limite = setTimeout(() => setFase('agotada'), LIMITE_ESPERA_MS);
    return () => {
      clearTimeout(aviso);
      clearTimeout(limite);
      setFase('normal');
    };
  }, [aprobando, vuelta]);

  const reiniciar = useCallback(() => setVuelta((anterior) => anterior + 1), []);
  const faseActual: FaseEspera = aprobando ? fase : 'normal';
  return {
    fase: faseActual,
    intervalo: aprobando && faseActual !== 'agotada' ? INTERVALO_CONSULTA_MS : false,
    reiniciar,
  };
}
