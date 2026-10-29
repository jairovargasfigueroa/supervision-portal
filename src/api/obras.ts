import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ClienteObras } from './cliente';
import type { EstadoPlanilla } from './planillas';

// Lo que el portal lee de Obras sobre las obras del cliente (docs/contratos/rest.md, «Obras»; 008, diseño).

export interface ObraResumen {
  id: string;
  nombre: string;
  ubicacion: string;
  estado: string;
  fechaInicio: string;
  avancePct: number;
  plazoPct: number;
  enRiesgo: boolean;
  ultimaPlanilla: { periodo: string; estado: EstadoPlanilla } | null;
}

export interface PartidaObra {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidadContratada: number;
  ejecutadaAcumulada: number;
  avancePct: number;
}

export interface ObraDetalle {
  id: string;
  nombre: string;
  ubicacion: string;
  estado: string;
  fechaInicio: string;
  avancePct: number;
  plazoPct: number;
  enRiesgo: boolean;
  contrato: { plazoDias: number; anticipoPct: number; retencionPct: number } | null;
  partidas: PartidaObra[];
}

/** Foto de avance; el cliente solo recibe las publicadas (las que respaldan una planilla presentada). */
export interface Foto {
  id: string;
  partidaId: string;
  registradoEn: string;
  publicadaCliente: boolean;
  /** URL firmada de descarga (30 min). */
  urlDescarga: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface PlanillaResumen {
  id: string;
  numero: number;
  periodo: string;
  estado: EstadoPlanilla;
  neto: number;
  cobroId: string | null;
  cobroNumero: string | null;
}

/** Fotos por página en la galería de la obra. */
export const FOTOS_POR_PAGINA = 20;
/** Máximo de la paginación (docs/convenciones.md). */
const TAMANO_MAXIMO = 100;

const ruta = (obraId: string) => `/obras/${encodeURIComponent(obraId)}`;

export function listarObras(cliente: ClienteObras, signal?: AbortSignal): Promise<ObraResumen[]> {
  return cliente.get('/obras', { signal });
}

export function obtenerObra(cliente: ClienteObras, obraId: string, signal?: AbortSignal): Promise<ObraDetalle> {
  return cliente.get(ruta(obraId), { signal });
}

export function listarFotos(
  cliente: ClienteObras,
  obraId: string,
  pagina: number,
  tamano: number,
  signal?: AbortSignal,
): Promise<Pagina<Foto>> {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  return cliente.get(`${ruta(obraId)}/fotos?${parametros}`, { signal });
}

/**
 * Fotos de respaldo de una planilla: las de `fotoIds` entre las publicadas de la obra. El contrato no filtra por id,
 * así que se recorren las páginas (de 100) hasta encontrarlas todas o terminar la lista.
 */
export async function listarFotosPorId(
  cliente: ClienteObras,
  obraId: string,
  fotoIds: readonly string[],
  signal?: AbortSignal,
): Promise<Foto[]> {
  if (fotoIds.length === 0) return [];
  const buscadas = new Set(fotoIds);
  const encontradas = new Map<string, Foto>();
  for (let pagina = 1; ; pagina++) {
    const resultado = await listarFotos(cliente, obraId, pagina, TAMANO_MAXIMO, signal);
    for (const foto of resultado.items) if (buscadas.has(foto.id)) encontradas.set(foto.id, foto);
    const sinMas = resultado.items.length === 0 || pagina * TAMANO_MAXIMO >= resultado.total;
    if (encontradas.size === buscadas.size || sinMas) break;
  }
  return fotoIds.flatMap((id) => encontradas.get(id) ?? []);
}

export function listarPlanillasDeObra(
  cliente: ClienteObras,
  obraId: string,
  signal?: AbortSignal,
): Promise<PlanillaResumen[]> {
  return cliente.get(`${ruta(obraId)}/planillas`, { signal });
}

/** Claves de TanStack Query de las obras (las mutaciones de planilla las invalidan). */
export const clavesObras = {
  todas: ['obras'] as const,
  detalle: (obraId: string) => ['obras', obraId] as const,
  fotos: (obraId: string) => ['obras', obraId, 'fotos'] as const,
  fotosPorId: (obraId: string, fotoIds: readonly string[]) => ['obras', obraId, 'fotos', 'ids', ...fotoIds] as const,
  planillas: (obraId: string) => ['obras', obraId, 'planillas'] as const,
};

export const consultaObras = (cliente: ClienteObras) =>
  queryOptions({ queryKey: clavesObras.todas, queryFn: ({ signal }) => listarObras(cliente, signal) });

export const consultaObra = (cliente: ClienteObras, obraId: string) =>
  queryOptions({ queryKey: clavesObras.detalle(obraId), queryFn: ({ signal }) => obtenerObra(cliente, obraId, signal) });

export const consultaFotosObra = (cliente: ClienteObras, obraId: string) =>
  infiniteQueryOptions({
    queryKey: clavesObras.fotos(obraId),
    queryFn: ({ pageParam, signal }) => listarFotos(cliente, obraId, pageParam, FOTOS_POR_PAGINA, signal),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.items.length > 0 && ultima.pagina * ultima.tamano < ultima.total ? ultima.pagina + 1 : undefined,
  });

export const consultaFotosPorId = (cliente: ClienteObras, obraId: string, fotoIds: readonly string[]) =>
  queryOptions({
    queryKey: clavesObras.fotosPorId(obraId, fotoIds),
    queryFn: ({ signal }) => listarFotosPorId(cliente, obraId, fotoIds, signal),
  });

export const consultaPlanillasDeObra = (cliente: ClienteObras, obraId: string) =>
  queryOptions({
    queryKey: clavesObras.planillas(obraId),
    queryFn: ({ signal }) => listarPlanillasDeObra(cliente, obraId, signal),
  });
