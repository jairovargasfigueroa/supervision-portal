import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const esquemaParametros = z.object({ planillaId: z.uuid() });

// Detalle de planilla: aprobar u observar (008, criterios 3 a 6). Se completa en la tarea 3.
export const Route = createFileRoute('/planillas/$planillaId')({
  params: { parse: (parametros) => esquemaParametros.parse(parametros) },
  component: DetallePlanilla,
});

function DetallePlanilla() {
  return <Typography variant="h1">Planilla</Typography>;
}
