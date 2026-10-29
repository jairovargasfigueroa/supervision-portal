import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { ClienteObras } from './cliente';
import { clavesObras } from './obras';

// Planillas que ve y revisa el cliente (docs/contratos/rest.md: GET /planillas/{id}, POST /planillas/{id}/aprobar y
// /observar; 008, diseño «Obras: endpoints del portal»). El cliente nunca recibe borradores.

export type EstadoPlanilla = 'BORRADOR' | 'PRESENTADA' | 'APROBANDO' | 'APROBADA' | 'OBSERVADA';

export interface LineaPlanilla {
  partidaId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  precioUnitario: number;
  cantidadContratada: number;
  acumuladoAnterior: number;
  cantidadPeriodo: number;
  acumuladoTotal: number;
  saldo: number;
  monto: number;
}

export interface PlanillaDetalle {
  id: string;
  obraId: string;
  numero: number;
  periodo: string;
  estado: EstadoPlanilla;
  version: number;
  lineas: LineaPlanilla[];
  subtotal: number;
  descuentoAnticipo: number;
  retencion: number;
  neto: number;
  anticipoPct: number;
  retencionPct: number;
  /** Motivo de la observación (del cliente o del fallo de la saga). */
  observacion: string | null;
  cobroId: string | null;
  cobroNumero: string | null;
  fotoIds: string[];
}

/** Límites del motivo al observar (008, criterio 4). */
export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 500;

const ruta = (planillaId: string) => `/planillas/${encodeURIComponent(planillaId)}`;

export function obtenerPlanilla(cliente: ClienteObras, planillaId: string, signal?: AbortSignal): Promise<PlanillaDetalle> {
  return cliente.get(ruta(planillaId), { signal });
}

/** Inicia la saga «aprobar planilla»: Obras responde `202 { estado: "APROBANDO" }`. */
export function aprobarPlanilla(cliente: ClienteObras, planillaId: string): Promise<{ estado: EstadoPlanilla }> {
  return cliente.post(`${ruta(planillaId)}/aprobar`);
}

/** Observa la planilla con el motivo; Obras responde `200` con el detalle (`OBSERVADA`). */
export function observarPlanilla(cliente: ClienteObras, planillaId: string, motivo: string): Promise<PlanillaDetalle> {
  return cliente.post(`${ruta(planillaId)}/observar`, { motivo });
}

export const clavesPlanillas = {
  detalle: (planillaId: string) => ['planillas', planillaId] as const,
};

export const consultaPlanilla = (cliente: ClienteObras, planillaId: string) =>
  queryOptions({
    queryKey: clavesPlanillas.detalle(planillaId),
    queryFn: ({ signal }) => obtenerPlanilla(cliente, planillaId, signal),
  });

/** Tras aprobar u observar: se vuelven a pedir la planilla, las planillas y el avance de su obra y la lista de obras. */
export async function invalidarDespuesDeRevisar(consultas: QueryClient, planillaId: string, obraId: string) {
  await Promise.all([
    consultas.invalidateQueries({ queryKey: clavesPlanillas.detalle(planillaId) }),
    consultas.invalidateQueries({ queryKey: clavesObras.detalle(obraId) }),
    consultas.invalidateQueries({ queryKey: clavesObras.todas, exact: true }),
  ]);
}
