import Chip from '@mui/material/Chip';
import type { EstadoPlanilla } from '../api/planillas';
import { colores } from '../tema';

export type TonoEstado = 'exito' | 'atencion' | 'error' | 'neutro';

const PALETA: Readonly<Record<TonoEstado, { fondo: string; texto: string }>> = {
  exito: { fondo: colores.exitoSuave, texto: colores.exito },
  atencion: { fondo: colores.atencionSuave, texto: colores.atencion },
  error: { fondo: colores.errorSuave, texto: colores.error },
  neutro: { fondo: colores.primarioSuave, texto: colores.textoSecundario },
};

/** Etiqueta y color de cada estado de planilla (docs/mensajes.md, «Etiquetas de estado»; docs/diseno-visual.md). */
const ESTADOS_PLANILLA: Readonly<Record<EstadoPlanilla, { etiqueta: string; tono: TonoEstado }>> = {
  BORRADOR: { etiqueta: 'Borrador', tono: 'neutro' },
  PRESENTADA: { etiqueta: 'Presentada', tono: 'atencion' },
  APROBANDO: { etiqueta: 'En aprobación', tono: 'atencion' },
  APROBADA: { etiqueta: 'Aprobada', tono: 'exito' },
  OBSERVADA: { etiqueta: 'Observada', tono: 'error' },
};

export interface EstadoChipProps {
  etiqueta: string;
  tono: TonoEstado;
}

/** Estado del dominio como chip: fondo suave y texto del color fuerte (docs/diseno-visual.md). */
export function EstadoChip({ etiqueta, tono }: EstadoChipProps) {
  const { fondo, texto } = PALETA[tono];
  return (
    <Chip label={etiqueta} size="small" data-tono={tono} sx={{ bgcolor: fondo, color: texto, fontWeight: 600 }} />
  );
}

/** Chip del estado de una planilla. */
export function EstadoPlanillaChip({ estado }: { estado: EstadoPlanilla }) {
  const { etiqueta, tono } = ESTADOS_PLANILLA[estado] ?? { etiqueta: estado, tono: 'neutro' };
  return <EstadoChip etiqueta={etiqueta} tono={tono} />;
}
