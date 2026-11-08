import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { z } from 'zod';
import { useClienteObras } from '../api/cliente';
import {
  consultaFotosObra,
  consultaObra,
  consultaPlanillasDeObra,
  type ObraDetalle,
  type PartidaObra,
  type PlanillaResumen,
} from '../api/obras';
import { BarraPorcentaje } from '../componentes/BarraPorcentaje';
import { BotonEnlace, TarjetaEnlace } from '../componentes/Enlaces';
import { EstadoPlanillaChip } from '../componentes/EstadoChip';
import { EstadoError } from '../componentes/EstadoError';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { GaleriaFotos } from '../componentes/GaleriaFotos';
import { Cargando, Seccion } from '../componentes/Seccion';
import { type CaracteristicasTabla, TablaDatos } from '../componentes/TablaDatos';
import { esNoEncontrado, mensajeDeError } from '../nucleo/errores';
import { formatearCantidad, formatearMonto, formatearPeriodo, formatearPorcentaje } from '../nucleo/formato';

const esquemaParametros = z.object({ obraId: z.uuid() });

// Detalle de obra (008, criterio 2): avance por partida, fotos publicadas y planillas (sin borradores).
export const Route = createFileRoute('/obras/$obraId')({
  params: { parse: (parametros) => esquemaParametros.parse(parametros) },
  component: DetalleObra,
  errorComponent: ObraNoEncontrada,
});

function ObraNoEncontrada() {
  const navegar = useNavigate();
  return (
    <Paper variant="outlined">
      <EstadoVacio mensaje="Obra no encontrada" accion={{ texto: 'Volver a mis obras', alPulsar: () => void navegar({ to: '/' }) }} />
    </Paper>
  );
}

function DetalleObra() {
  const { obraId } = Route.useParams();
  const cliente = useClienteObras();
  const obra = useQuery(consultaObra(cliente, obraId));

  return (
    <Stack spacing={2}>
      <Box>
        <BotonEnlace to="/" startIcon={<ArrowBackIcon />} sx={{ ml: -1 }}>
          Mis obras
        </BotonEnlace>
      </Box>
      {obra.isPending ? (
        <Cargando etiqueta="Cargando obra" />
      ) : obra.isError ? (
        esNoEncontrado(obra.error) ? (
          <ObraNoEncontrada />
        ) : (
          <Paper variant="outlined">
            <EstadoError mensaje={mensajeDeError(obra.error)} alReintentar={() => void obra.refetch()} />
          </Paper>
        )
      ) : (
        <ContenidoObra obra={obra.data} />
      )}
    </Stack>
  );
}

function ContenidoObra({ obra }: { obra: ObraDetalle }) {
  return (
    <>
      <Box>
        <Typography variant="h1">{obra.nombre}</Typography>
        <Typography color="text.secondary">{obra.ubicacion}</Typography>
      </Box>
      <Seccion titulo="Avance físico y plazo transcurrido">
        <Stack spacing={2}>
          <BarraPorcentaje etiqueta="Avance físico" porcentaje={obra.avancePct} />
          <BarraPorcentaje etiqueta="Plazo transcurrido" porcentaje={obra.plazoPct} color="secondary" />
        </Stack>
      </Seccion>
      <Seccion titulo="Avance por partida">
        <TablaPartidas partidas={obra.partidas} />
      </Seccion>
      <SeccionPlanillas obraId={obra.id} />
      <SeccionFotos obra={obra} />
    </>
  );
}

const columnaPartida = createColumnHelper<CaracteristicasTabla, PartidaObra>();
const columnasPartidas = [
  columnaPartida.accessor('codigo', { header: 'Código', meta: { secundaria: true } }),
  columnaPartida.accessor('nombre', {
    header: 'Partida',
    cell: (celda) => celda.getValue(),
  }),
  columnaPartida.accessor('unidad', { header: 'Unidad', meta: { secundaria: true } }),
  columnaPartida.accessor('cantidadContratada', {
    header: 'Contratado',
    cell: (celda) => formatearCantidad(celda.getValue(), celda.row.original.unidad),
    meta: { numerica: true, secundaria: true },
  }),
  columnaPartida.accessor('ejecutadaAcumulada', {
    header: 'Ejecutado acumulado',
    cell: (celda) => formatearCantidad(celda.getValue(), celda.row.original.unidad),
    meta: { numerica: true, secundaria: true },
  }),
  columnaPartida.accessor('avancePct', {
    header: 'Avance',
    cell: (celda) => formatearPorcentaje(celda.getValue()),
    meta: { numerica: true },
  }),
];

function TablaPartidas({ partidas }: { partidas: PartidaObra[] }) {
  return (
    <TablaDatos
      etiqueta="Avance por partida"
      columnas={columnasPartidas}
      filas={partidas}
      idFila={(partida) => partida.id}
      vacio={<EstadoVacio mensaje="Esta obra no tiene partidas." />}
    />
  );
}

function SeccionPlanillas({ obraId }: { obraId: string }) {
  const cliente = useClienteObras();
  const planillas = useQuery(consultaPlanillasDeObra(cliente, obraId));
  return (
    <Seccion titulo="Planillas">
      {planillas.isPending ? (
        <Cargando etiqueta="Cargando planillas" />
      ) : planillas.isError ? (
        <EstadoError mensaje={mensajeDeError(planillas.error)} alReintentar={() => void planillas.refetch()} />
      ) : planillas.data.length === 0 ? (
        <EstadoVacio mensaje="Aún no hay planillas." />
      ) : (
        <Stack component="ul" spacing={1.5} aria-label="Planillas" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {[...planillas.data]
            .filter((planilla) => planilla.estado !== 'BORRADOR')
            .sort((a, b) => b.numero - a.numero)
            .map((planilla) => (
              <li key={planilla.id}>
                <TarjetaPlanilla planilla={planilla} />
              </li>
            ))}
        </Stack>
      )}
    </Seccion>
  );
}

function TarjetaPlanilla({ planilla }: { planilla: PlanillaResumen }) {
  const porRevisar = planilla.estado === 'PRESENTADA';
  return (
    <Card variant="outlined">
      <TarjetaEnlace to="/planillas/$planillaId" params={{ planillaId: planilla.id }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600 }}>Planilla N.º {planilla.numero}</Typography>
              <EstadoPlanillaChip estado={planilla.estado} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatearPeriodo(planilla.periodo)}
              {planilla.cobroNumero ? ` · Cobro ${planilla.cobroNumero}` : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" component="div">
              Neto
            </Typography>
            <Typography variant="numero" sx={{ fontWeight: 600 }}>
              {formatearMonto(planilla.neto)}
            </Typography>
            {porRevisar && (
              <Typography variant="caption" color="primary" component="div" sx={{ fontWeight: 600 }}>
                Por revisar
              </Typography>
            )}
          </Box>
        </CardContent>
      </TarjetaEnlace>
    </Card>
  );
}

function SeccionFotos({ obra }: { obra: ObraDetalle }) {
  const cliente = useClienteObras();
  const fotos = useInfiniteQuery(consultaFotosObra(cliente, obra.id));
  const nombres = new Map(obra.partidas.map((partida) => [partida.id, `${partida.codigo} ${partida.nombre}`]));
  return (
    <Seccion titulo="Fotos de la obra">
      {fotos.isPending ? (
        <Cargando etiqueta="Cargando fotos" />
      ) : fotos.isError ? (
        <EstadoError alReintentar={() => void fotos.refetch()} />
      ) : (
        <GaleriaFotos
          fotos={fotos.data.pages.flatMap((pagina) => pagina.items)}
          nombrePartida={(id) => nombres.get(id)}
          vacio="Aún no hay fotos de avance."
          cargarMas={{
            hayMas: fotos.hasNextPage,
            cargando: fotos.isFetchingNextPage,
            alPulsar: () => void fotos.fetchNextPage(),
          }}
        />
      )}
    </Seccion>
  );
}
