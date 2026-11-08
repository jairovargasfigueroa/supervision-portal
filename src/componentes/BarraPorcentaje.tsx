import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { formatearPorcentaje } from '../nucleo/formato';

export interface BarraPorcentajeProps {
  etiqueta: string;
  /** De 0 a 100 (puede pasar de 100: la barra se llena y el número muestra el valor real). */
  porcentaje: number;
  color?: 'primary' | 'secondary';
}

/** Etiqueta, porcentaje y barra (avance físico o plazo transcurrido, como en el prototipo del portal). */
export function BarraPorcentaje({ etiqueta, porcentaje, color = 'primary' }: BarraPorcentajeProps) {
  const id = useId();
  const lleno = Math.max(0, Math.min(100, porcentaje));
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
        <Typography id={id} variant="body2">
          {etiqueta}
        </Typography>
        <Typography variant="numero" sx={{ fontWeight: 500 }}>
          {formatearPorcentaje(porcentaje)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={lleno}
        color={color}
        aria-labelledby={id}
        sx={{ height: 10, borderRadius: 999 }}
      />
    </Box>
  );
}
