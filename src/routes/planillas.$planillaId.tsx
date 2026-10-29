import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { z } from 'zod';
import { esErrorCon, useClienteObras } from '../api/cliente';
import { consultaFotosPorId, consultaObra } from '../api/obras';
import {
  aprobarPlanilla,
  clavesPlanillas,
  consultaPlanilla,
  invalidarDespuesDeRevisar,
  type LineaPlanilla,
  observarPlanilla,
  type PlanillaDetalle,
} from '../api/planillas';
import { AprobarDialogo } from '../componentes/AprobarDialogo';
import { BotonEnlace } from '../componentes/Enlaces';
import { EstadoPlanillaChip } from '../componentes/EstadoChip';
import { EstadoError } from '../componentes/EstadoError';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { GaleriaFotos } from '../componentes/GaleriaFotos';
import { ObservarDialogo } from '../componentes/ObservarDialogo';
import { Cargando, Seccion } from '../componentes/Seccion';
import { type CaracteristicasTabla, TablaDatos } from '../componentes/TablaDatos';
import { esNoEncontrado, mensajeDeError } from '../nucleo/errores';
import { type FaseEspera, useEsperaAprobacion } from '../nucleo/esperaAprobacion';
import { formatearCantidad, formatearMonto, formatearPeriodo, formatearPorcentaje } from '../nucleo/formato';
import { estiloNumero } from '../tema';

const esquemaParametros = z.object({ planillaId: z.uuid() });

// Detalle de planilla (008, criterios 3 a 6): líneas, totales y fotos de respaldo; «Aprobar» (con confirmación y
// espera de la saga) y «Observar» (con motivo) mientras está PRESENTADA; resultado APROBADA u OBSERVADA.
export const Route = createFileRoute('/planillas/$planillaId')({
  params: { parse: (parametros) => esquemaParametros.parse(parametros) },
  component: DetallePlanilla,
  errorComponent: PlanillaNoEncontrada,
});

function PlanillaNoEncontrada() {
  const navegar = useNavigate();
  return (
    <Paper variant="outlined">
      <EstadoVacio
        mensaje="Planilla no encontrada"
        accion={{ texto: 'Volver a mis obras', alPulsar: () => void navegar({ to: '/' }) }}
      />
    </Paper>
  );
}

function DetallePlanilla() {
  const { planillaId } = Route.useParams();
  const cliente = useClienteObras();
  // La consulta conoce el estado; la espera decide si se sigue consultando cada 2 s (solo mientras está APROBANDO).
  const [aprobando, setAprobando] = useState(false);
  const espera = useEsperaAprobacion(aprobando);
  const planilla = useQuery({ ...consultaPlanilla(cliente, planillaId), refetchInterval: espera.intervalo });
  const estaAprobando = planilla.data?.estado === 'APROBANDO';
  if (estaAprobando !== aprobando) setAprobando(estaAprobando);

  if (planilla.isPending) return <Cargando etiqueta="Cargando planilla" />;
  if (planilla.isError) {
    if (esNoEncontrado(planilla.error)) return <PlanillaNoEncontrada />;
    return (
      <Paper variant="outlined">
        <EstadoError mensaje={mensajeDeError(planilla.error)} alReintentar={() => void planilla.refetch()} />
      </Paper>
    );
  }
  return (
    <ContenidoPlanilla
      planilla={planilla.data}
      faseEspera={espera.fase}
      alActualizar={() => {
        espera.reiniciar();
        void planilla.refetch();
      }}
    />
  );
}

function ContenidoPlanilla({
  planilla,
  faseEspera,
  alActualizar,
}: {
  planilla: PlanillaDetalle;
  faseEspera: FaseEspera;
  alActualizar: () => void;
}) {
  const cliente = useClienteObras();
  const consultas = useQueryClient();
  const obra = useQuery(consultaObra(cliente, planilla.obraId));
  const [confirmando, setConfirmando] = useState(false);
  const [observando, setObservando] = useState(false);

  const alTerminarRevision = async (error?: unknown) => {
    // Si la planilla ya no estaba PRESENTADA (409), se vuelve a pedir para ver su estado actual.
    if (error && !esErrorCon(error, 'PLANILLA_NO_PRESENTADA')) return;
    await invalidarDespuesDeRevisar(consultas, planilla.id, planilla.obraId);
  };

  const aprobar = useMutation({
    mutationFn: () => aprobarPlanilla(cliente, planilla.id),
    onSuccess: async (respuesta) => {
      consultas.setQueryData<PlanillaDetalle>(clavesPlanillas.detalle(planilla.id), (anterior) =>
        anterior ? { ...anterior, estado: respuesta?.estado ?? 'APROBANDO' } : anterior,
      );
      setConfirmando(false);
      await alTerminarRevision();
    },
    onError: (error) => alTerminarRevision(error),
  });

  const observar = async (motivo: string) => {
    try {
      const actualizada = await observarPlanilla(cliente, planilla.id, motivo);
      consultas.setQueryData(clavesPlanillas.detalle(planilla.id), actualizada);
      setObservando(false);
      await alTerminarRevision();
    } catch (error) {
      await alTerminarRevision(error);
      throw error;
    }
  };

  const porRevisar = planilla.estado === 'PRESENTADA';

  return (
    <Stack spacing={2}>
      <Box>
        <BotonEnlace to="/obras/$obraId" params={{ obraId: planilla.obraId }} startIcon={<ArrowBackIcon />} sx={{ ml: -1 }}>
          {obra.data?.nombre ?? 'Volver a la obra'}
        </BotonEnlace>
      </Box>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h1">Planilla N.º {planilla.numero}</Typography>
          <EstadoPlanillaChip estado={planilla.estado} />
        </Box>
        <Typography color="text.secondary">Periodo: {formatearPeriodo(planilla.periodo)}</Typography>
      </Box>

      <Resultado planilla={planilla} faseEspera={faseEspera} alActualizar={alActualizar} />

      <Seccion titulo="Detalle de la planilla">
        <TablaLineas lineas={planilla.lineas} />
        <Totales planilla={planilla} />
      </Seccion>

      <SeccionFotosRespaldo planilla={planilla} nombres={new Map(planilla.lineas.map((l) => [l.partidaId, `${l.codigo} ${l.nombre}`]))} />

      {porRevisar && (
        <Paper
          variant="outlined"
          sx={{
            position: { xs: 'sticky', sm: 'static' },
            bottom: 0,
            zIndex: 1,
            p: 2,
            mx: { xs: -2, sm: 0 },
            borderRadius: { xs: 0, sm: '10px' },
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            onClick={() => setObservando(true)}
            sx={{ flex: { xs: 1, sm: '0 0 auto' } }}
          >
            Observar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              aprobar.reset();
              setConfirmando(true);
            }}
            sx={{ flex: { xs: 1, sm: '0 0 auto' } }}
          >
            Aprobar
          </Button>
        </Paper>
      )}

      <AprobarDialogo
        abierto={confirmando}
        numero={planilla.numero}
        neto={planilla.neto}
        enviando={aprobar.isPending}
        error={aprobar.isError ? mensajeDeError(aprobar.error) : undefined}
        alConfirmar={() => aprobar.mutate()}
        alCancelar={() => setConfirmando(false)}
      />
      <ObservarDialogo
        abierto={observando}
        numero={planilla.numero}
        alEnviar={observar}
        alCancelar={() => setObservando(false)}
      />
    </Stack>
  );
}

/** Estado de la revisión: en aprobación (con el aviso de los 90 s), aprobada con su cobro u observada con el motivo. */
function Resultado({
  planilla,
  faseEspera,
  alActualizar,
}: {
  planilla: PlanillaDetalle;
  faseEspera: FaseEspera;
  alActualizar: () => void;
}) {
  if (planilla.estado === 'APROBANDO') {
    return (
      <Alert
        severity="info"
        icon={<CircularProgress size={20} aria-hidden />}
        role="status"
        action={
          faseEspera === 'agotada' ? (
            <Button color="inherit" onClick={alActualizar}>
              Actualizar
            </Button>
          ) : undefined
        }
      >
        <AlertTitle sx={{ mb: faseEspera === 'normal' ? 0 : 0.5 }}>En aprobación…</AlertTitle>
        {faseEspera !== 'normal' &&
          'La aprobación está tardando más de lo normal; puedes cerrar esta pantalla, el resultado aparecerá aquí'}
      </Alert>
    );
  }
  if (planilla.estado === 'APROBADA') {
    return (
      <Alert severity="success" role="status">
        <AlertTitle>Planilla aprobada</AlertTitle>
        {planilla.cobroNumero && (
          <>
            Número de cobro: <Box component="span" sx={{ ...estiloNumero, fontWeight: 600 }}>{planilla.cobroNumero}</Box>
          </>
        )}
      </Alert>
    );
  }
  if (planilla.estado === 'OBSERVADA') {
    return (
      <Alert severity="error" role="status">
        <AlertTitle>Planilla observada</AlertTitle>
        {planilla.observacion}
      </Alert>
    );
  }
  return null;
}

const columnaLinea = createColumnHelper<CaracteristicasTabla, LineaPlanilla>();
const cantidad = (valor: number, linea: LineaPlanilla) => formatearCantidad(valor, linea.unidad);
const columnasLineas = [
  columnaLinea.accessor('nombre', {
    header: 'Partida',
    cell: (celda) => `${celda.row.original.codigo} ${celda.getValue()}`,
  }),
  columnaLinea.accessor('cantidadPeriodo', {
    header: 'Cantidad del periodo',
    cell: (celda) => cantidad(celda.getValue(), celda.row.original),
    meta: { numerica: true },
  }),
  columnaLinea.accessor('precioUnitario', {
    header: 'Precio unitario',
    cell: (celda) => formatearMonto(celda.getValue()),
    meta: { numerica: true, secundaria: true },
  }),
  columnaLinea.accessor('cantidadContratada', {
    header: 'Contratado',
    cell: (celda) => cantidad(celda.getValue(), celda.row.original),
    meta: { numerica: true, secundaria: true },
  }),
  columnaLinea.accessor('acumuladoAnterior', {
    header: 'Acumulado anterior',
    cell: (celda) => cantidad(celda.getValue(), celda.row.original),
    meta: { numerica: true, secundaria: true },
  }),
  columnaLinea.accessor('acumuladoTotal', {
    header: 'Acumulado total',
    cell: (celda) => cantidad(celda.getValue(), celda.row.original),
    meta: { numerica: true, secundaria: true },
  }),
  columnaLinea.accessor('saldo', {
    header: 'Saldo',
    cell: (celda) => cantidad(celda.getValue(), celda.row.original),
    meta: { numerica: true, secundaria: true },
  }),
  columnaLinea.accessor('monto', {
    header: 'Monto',
    cell: (celda) => formatearMonto(celda.getValue()),
    meta: { numerica: true },
  }),
];

function TablaLineas({ lineas }: { lineas: LineaPlanilla[] }) {
  return (
    <TablaDatos etiqueta="Líneas de la planilla" columnas={columnasLineas} filas={lineas} idFila={(linea) => linea.partidaId} />
  );
}

function Totales({ planilla }: { planilla: PlanillaDetalle }) {
  const filas = [
    { etiqueta: 'Subtotal', valor: formatearMonto(planilla.subtotal) },
    {
      etiqueta: `(−) Anticipo ${formatearPorcentaje(planilla.anticipoPct)}`,
      valor: `− ${formatearMonto(planilla.descuentoAnticipo)}`,
    },
    {
      etiqueta: `(−) Retención ${formatearPorcentaje(planilla.retencionPct)}`,
      valor: `− ${formatearMonto(planilla.retencion)}`,
    },
  ];
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
      <Box component="dl" aria-label="Totales" sx={{ m: 0, width: '100%', maxWidth: 360, display: 'grid', gap: 0.75 }}>
        {filas.map((fila) => (
          <Box key={fila.etiqueta} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography component="dt">{fila.etiqueta}</Typography>
            <Typography component="dd" variant="numero" sx={{ m: 0 }}>
              {fila.valor}
            </Typography>
          </Box>
        ))}
        <Divider sx={{ borderColor: 'text.primary', borderBottomWidth: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography component="dt" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Neto a pagar
          </Typography>
          <Typography component="dd" variant="numero" sx={{ m: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {formatearMonto(planilla.neto)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SeccionFotosRespaldo({ planilla, nombres }: { planilla: PlanillaDetalle; nombres: Map<string, string> }) {
  const cliente = useClienteObras();
  const fotos = useQuery(consultaFotosPorId(cliente, planilla.obraId, planilla.fotoIds));
  return (
    <Seccion titulo="Fotos de respaldo">
      {fotos.isPending ? (
        <Cargando etiqueta="Cargando fotos" />
      ) : fotos.isError ? (
        <EstadoError alReintentar={() => void fotos.refetch()} />
      ) : (
        <GaleriaFotos
          fotos={fotos.data}
          nombrePartida={(id) => nombres.get(id)}
          vacio="Esta planilla no tiene fotos de respaldo."
        />
      )}
    </Seccion>
  );
}
