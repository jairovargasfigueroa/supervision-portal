import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useClienteObras } from '../api/cliente';
import { consultaObras, type ObraResumen } from '../api/obras';
import { BarraPorcentaje } from '../componentes/BarraPorcentaje';
import { TarjetaEnlace } from '../componentes/Enlaces';
import { EstadoError } from '../componentes/EstadoError';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Cargando } from '../componentes/Seccion';
import { mensajeDeError } from '../nucleo/errores';

// Mis obras (008, criterio 1): nombre, ubicación, avance % y plazo transcurrido % de cada obra del cliente.
export const Route = createFileRoute('/')({ component: MisObras });

function MisObras() {
  const cliente = useClienteObras();
  const obras = useQuery(consultaObras(cliente));

  return (
    <>
      <Typography variant="h1" sx={{ mb: 2 }}>
        Mis obras
      </Typography>
      {obras.isPending ? (
        <Cargando etiqueta="Cargando obras" />
      ) : obras.isError ? (
        <Paper variant="outlined">
          <EstadoError mensaje={mensajeDeError(obras.error)} alReintentar={() => void obras.refetch()} />
        </Paper>
      ) : obras.data.length === 0 ? (
        <Paper variant="outlined">
          <EstadoVacio mensaje="Aún no hay obras para mostrar." />
        </Paper>
      ) : (
        <Stack component="ul" spacing={2} aria-label="Obras" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {obras.data.map((obra) => (
            <li key={obra.id}>
              <TarjetaObra obra={obra} />
            </li>
          ))}
        </Stack>
      )}
    </>
  );
}

function TarjetaObra({ obra }: { obra: ObraResumen }) {
  return (
    <Card variant="outlined">
      <TarjetaEnlace to="/obras/$obraId" params={{ obraId: obra.id }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography variant="h2" component="h2">
              {obra.nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {obra.ubicacion}
            </Typography>
          </Box>
          <BarraPorcentaje etiqueta="Avance físico" porcentaje={obra.avancePct} />
          <BarraPorcentaje etiqueta="Plazo transcurrido" porcentaje={obra.plazoPct} color="secondary" />
        </CardContent>
      </TarjetaEnlace>
    </Card>
  );
}
