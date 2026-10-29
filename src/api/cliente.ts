import { QueryClient } from '@tanstack/react-query';
import { createContext, createElement, type ReactNode, useContext, useMemo } from 'react';
import { useAuth } from 'react-oidc-context';

// Cliente REST hacia Obras (VITE_OBRAS_URL) con el token de acceso de react-oidc-context.
// Los errores llegan como Problem Details con `codigo` (docs/convenciones.md, «Errores REST») y se convierten en ErrorApi.

/** Tiempo máximo que el portal espera una respuesta antes de darla por perdida. */
export const TIEMPO_MAXIMO_MS = 30_000;

/** Error de validación por campo (`errores[]` del Problem Details). */
export interface ErrorDeCampo {
  campo: string;
  mensaje: string;
}

/** Tipo de falla: el servidor respondió con error, no hubo conexión o no respondió a tiempo. */
export type TipoErrorApi = 'respuesta' | 'red' | 'tiempo';

/** Error de una llamada a Obras. `codigo` es el del Problem Details o el genérico de su estado. */
export class ErrorApi extends Error {
  readonly tipo: TipoErrorApi;
  readonly estado: number | null;
  readonly codigo: string | undefined;
  readonly errores: ErrorDeCampo[];

  constructor(datos: { tipo: TipoErrorApi; estado?: number | null; codigo?: string; errores?: ErrorDeCampo[]; detalle?: string }) {
    super(datos.detalle ?? datos.codigo ?? datos.tipo);
    this.name = 'ErrorApi';
    this.tipo = datos.tipo;
    this.estado = datos.estado ?? null;
    this.codigo = datos.codigo;
    this.errores = datos.errores ?? [];
  }
}

/** Código genérico de cada estado (docs/convenciones.md). 404, 409 y 422 siempre traen uno propio. */
const CODIGO_GENERICO: Readonly<Record<number, string>> = {
  400: 'DATOS_INVALIDOS',
  401: 'NO_AUTENTICADO',
  403: 'SIN_PERMISO',
  413: 'ARCHIVO_DEMASIADO_GRANDE',
  429: 'DEMASIADAS_PETICIONES',
  500: 'ERROR_INTERNO',
  503: 'SERVICIO_NO_DISPONIBLE',
  504: 'TIEMPO_AGOTADO',
};

export interface OpcionesCliente {
  /** URL base de Obras, sin barra final. */
  urlBase: string;
  /** Devuelve el token de acceso vigente (react-oidc-context lo renueva solo). */
  obtenerToken: () => string | undefined;
  /** Para las pruebas: un fetch simulado. */
  fetch?: typeof fetch;
  /** Para las pruebas: tiempo máximo distinto. */
  tiempoMaximoMs?: number;
}

export interface OpcionesPedido {
  /** Señal de TanStack Query para cancelar el pedido. */
  signal?: AbortSignal;
}

export interface ClienteObras {
  get<T>(ruta: string, opciones?: OpcionesPedido): Promise<T>;
  post<T>(ruta: string, cuerpo?: unknown, opciones?: OpcionesPedido): Promise<T>;
}

export function crearClienteObras(opciones: OpcionesCliente): ClienteObras {
  const pedir = async <T>(metodo: 'GET' | 'POST', ruta: string, cuerpo: unknown, pedido: OpcionesPedido = {}): Promise<T> => {
    const encabezados: Record<string, string> = { Accept: 'application/json, application/problem+json' };
    const token = opciones.obtenerToken();
    if (token) encabezados['Authorization'] = `Bearer ${token}`;
    if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';

    // Se cancela si TanStack Query lo pide o si pasa el tiempo máximo.
    const control = new AbortController();
    let vencido = false;
    const reloj = setTimeout(() => {
      vencido = true;
      control.abort();
    }, opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS);
    const cancelar = () => control.abort();
    pedido.signal?.addEventListener('abort', cancelar);

    let respuesta: Response;
    try {
      respuesta = await (opciones.fetch ?? fetch)(`${opciones.urlBase}${ruta}`, {
        method: metodo,
        headers: encabezados,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch (error) {
      if (vencido) throw new ErrorApi({ tipo: 'tiempo' });
      if (pedido.signal?.aborted) throw error;
      throw new ErrorApi({ tipo: 'red', detalle: error instanceof Error ? error.message : undefined });
    } finally {
      clearTimeout(reloj);
      pedido.signal?.removeEventListener('abort', cancelar);
    }

    if (!respuesta.ok) throw await leerProblema(respuesta);
    if (respuesta.status === 204) return undefined as T;
    const texto = await respuesta.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  };

  return {
    get: (ruta, pedido) => pedir('GET', ruta, undefined, pedido),
    post: (ruta, cuerpo, pedido) => pedir('POST', ruta, cuerpo, pedido),
  };
}

/** Convierte una respuesta de error (Problem Details) en ErrorApi; sin `codigo`, usa el genérico de su estado. */
async function leerProblema(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: { codigo?: unknown; errores?: unknown; detail?: unknown } = {};
  try {
    const datos: unknown = JSON.parse(await respuesta.text());
    if (typeof datos === 'object' && datos !== null) cuerpo = datos;
  } catch {
    // Cuerpo vacío o que no es JSON: queda el genérico del estado.
  }
  const codigo = typeof cuerpo.codigo === 'string' && cuerpo.codigo ? cuerpo.codigo : CODIGO_GENERICO[respuesta.status];
  const errores = Array.isArray(cuerpo.errores)
    ? cuerpo.errores.filter(
        (e): e is ErrorDeCampo =>
          typeof e === 'object' && e !== null && typeof e.campo === 'string' && typeof e.mensaje === 'string',
      )
    : [];
  return new ErrorApi({
    tipo: 'respuesta',
    estado: respuesta.status,
    codigo,
    errores,
    detalle: typeof cuerpo.detail === 'string' ? cuerpo.detail : undefined,
  });
}

/** Reintentos de las consultas: solo fallas de red, de tiempo o del servidor (5xx), hasta 2 veces; nunca un 4xx. */
export function debeReintentar(intentos: number, error: unknown): boolean {
  if (intentos >= 2) return false;
  if (!(error instanceof ErrorApi)) return false;
  return error.tipo !== 'respuesta' || (error.estado ?? 0) >= 500;
}

/** Cliente de TanStack Query del portal. */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: debeReintentar }, mutations: { retry: false } },
  });
}

/** `true` si el error es un ErrorApi con ese código. */
export function esErrorCon(error: unknown, codigo: string): boolean {
  return error instanceof ErrorApi && error.codigo === codigo;
}

const ContextoClienteObras = createContext<ClienteObras | null>(null);

/** Da a las pantallas el cliente de Obras con el token de la sesión actual. */
export function ProveedorClienteObras({ urlBase, children }: { urlBase: string; children: ReactNode }) {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const cliente = useMemo(() => crearClienteObras({ urlBase, obtenerToken: () => token }), [urlBase, token]);
  return createElement(ContextoClienteObras.Provider, { value: cliente }, children);
}

/** Para las pruebas: da un cliente ya armado (por ejemplo, con un fetch simulado). */
export function ProveedorClienteObrasFijo({ cliente, children }: { cliente: ClienteObras; children: ReactNode }) {
  return createElement(ContextoClienteObras.Provider, { value: cliente }, children);
}

export function useClienteObras(): ClienteObras {
  const cliente = useContext(ContextoClienteObras);
  if (!cliente) throw new Error('Falta ProveedorClienteObras');
  return cliente;
}
