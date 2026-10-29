import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { EstadoVacio } from '../componentes/EstadoVacio';

// Mis obras: por ahora solo el estado vacío; la lista con avance llega con la 008.
export const Route = createFileRoute('/')({ component: MisObras });

function MisObras() {
  return (
    <>
      <Typography variant="h1" sx={{ mb: 2 }}>
        Mis obras
      </Typography>
      <Paper variant="outlined">
        <EstadoVacio mensaje="Aún no hay obras para mostrar." />
      </Paper>
    </>
  );
}
