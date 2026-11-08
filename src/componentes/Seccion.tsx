import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';

/** Tarjeta de una sección de la pantalla con su título (cada sección carga y falla por su cuenta). */
export function Seccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  const id = useId();
  return (
    <Paper component="section" variant="outlined" aria-labelledby={id} sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography id={id} variant="h2" component="h2">
          {titulo}
        </Typography>
        {accion}
      </Box>
      {children}
    </Paper>
  );
}

/** Indicador de carga de un área. */
export function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress aria-label={etiqueta} />
    </Box>
  );
}
