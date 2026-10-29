import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { AuthContextProps } from 'react-oidc-context';
import { vi } from 'vitest';
import { crearClienteObras, ProveedorClienteObrasFijo } from '../api/cliente';
import { routeTree } from '../routeTree.gen';
import { tema } from '../tema';

// Ayudas para las pruebas de pantallas: sesión de cliente simulada y Obras simulado (respuestas del contrato,
// docs/contratos/rest.md). Solo las importan los archivos .test.tsx.

/** Token de prueba sin firma (el portal solo lee su contenido). */
export function tokenDePrueba(datos: Record<string, unknown>): string {
  const base64url = (texto: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(datos))}.firma`;
}

/** Hace que el `useAuth` simulado devuelva una sesión del cliente con el rol `cliente` iniciada en el portal. */
export function conSesionCliente(useAuthSimulado: { mockReturnValue: (valor: AuthContextProps) => unknown }) {
  const auth = {
    isLoading: false,
    isAuthenticated: true,
    activeNavigator: undefined,
    error: undefined,
    user: {
      access_token: tokenDePrueba({ sub: 'cliente-1', azp: 'portal', realm_access: { roles: ['cliente'] } }),
      profile: { sub: 'cliente-1', name: 'Roberto Justiniano Paz' },
      expired: false,
    },
    signinRedirect: vi.fn(() => Promise.resolve()),
    signoutRedirect: vi.fn(() => Promise.resolve()),
    events: { addSilentRenewError: vi.fn(() => () => {}), addAccessTokenExpired: vi.fn(() => () => {}) },
  };
  useAuthSimulado.mockReturnValue(auth as unknown as AuthContextProps);
  return auth;
}

export interface RespuestaSimulada {
  estado: number;
  cuerpo?: unknown;
}

/** Recibe método y ruta (con la consulta, sin el origen) y el cuerpo enviado; devuelve la respuesta de Obras. */
export type ManejadorObras = (metodo: string, ruta: string, cuerpo: unknown) => RespuestaSimulada | Promise<RespuestaSimulada>;

/** Problem Details como los de Obras. */
export function problema(estado: number, codigo: string): RespuestaSimulada {
  return { estado, cuerpo: { type: 'about:blank', title: codigo, status: estado, codigo } };
}

/** Monta el portal completo (rutas reales) en `ruta`, con Obras simulado. */
export function montarPortal(ruta: string, manejador: ManejadorObras) {
  const llamadas: { metodo: string; ruta: string; cuerpo: unknown }[] = [];
  const fetchSimulado: typeof fetch = async (entrada, init) => {
    const url = new URL(String(entrada));
    const metodo = init?.method ?? 'GET';
    const cuerpo = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const rutaPedida = `${url.pathname}${url.search}`;
    llamadas.push({ metodo, ruta: rutaPedida, cuerpo });
    const respuesta = await manejador(metodo, rutaPedida, cuerpo);
    return new Response(respuesta.cuerpo === undefined ? null : JSON.stringify(respuesta.cuerpo), {
      status: respuesta.estado,
      headers: { 'Content-Type': respuesta.estado >= 400 ? 'application/problem+json' : 'application/json' },
    });
  };
  const cliente = crearClienteObras({ urlBase: 'http://obras', obtenerToken: () => 'token', fetch: fetchSimulado });
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [ruta] }) });
  render(
    <ProveedorClienteObrasFijo cliente={cliente}>
      <QueryClientProvider client={consultas}>
        <ThemeProvider theme={tema}>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </ProveedorClienteObrasFijo>,
  );
  return { router, llamadas, consultas };
}

// Datos de prueba con los ids fijos de docs/datos-prueba.md.
export const OBRA_1 = 'b0000000-0000-4000-8000-000000000001';
export const PLANILLA_103 = 'd0000000-0000-4000-8000-000000000103';

export const obraResumen = {
  id: OBRA_1,
  nombre: 'Edificio Residencial Las Palmeras',
  ubicacion: 'Av. Banzer 4to anillo, Santa Cruz',
  estado: 'EN_EJECUCION',
  fechaInicio: '2026-07-01',
  avancePct: 28.49,
  plazoPct: 38.61,
  enRiesgo: false,
  ultimaPlanilla: { periodo: '2026-09', estado: 'APROBADA' },
};

export const obraDetalle = {
  ...obraResumen,
  motivoRechazoContrato: null,
  asignaciones: { residenteId: 'r', maestroId: 'm', almaceneroId: 'a', clienteId: 'cliente-1' },
  contrato: { contratoId: 'c', monto: 2773800, plazoDias: 300, anticipoPct: 10, retencionPct: 7 },
  partidas: [
    {
      id: 'b1000000-0000-4000-8000-000000000102',
      codigo: 'P-02',
      nombre: 'Excavación',
      unidad: 'm³',
      cantidadContratada: 400,
      precioUnitario: 85,
      meses: 'jul-ago',
      ejecutadaAcumulada: 400,
      avancePct: 100,
      insumos: [],
    },
    {
      id: 'b1000000-0000-4000-8000-000000000103',
      codigo: 'P-03',
      nombre: 'Cimientos de hormigón',
      unidad: 'm³',
      cantidadContratada: 140,
      precioUnitario: 1450,
      meses: 'ago-sep',
      ejecutadaAcumulada: 50,
      avancePct: 35.71,
      insumos: [],
    },
  ],
};

export const planillasDeObra = [
  { id: 'd0000000-0000-4000-8000-000000000101', numero: 1, periodo: '2026-08', estado: 'APROBADA', neto: 290134.8, cobroId: 'c1', cobroNumero: 'COB-2026-0001' },
  { id: PLANILLA_103, numero: 3, periodo: '2026-10', estado: 'PRESENTADA', neto: 41881.8, cobroId: null, cobroNumero: null },
];

export function foto(numero: number, partidaId = 'b1000000-0000-4000-8000-000000000103') {
  return {
    id: `f1000000-0000-4000-8000-0000000103${String(numero).padStart(2, '0')}`,
    partidaId,
    registradoPor: 'maestro-1',
    registradoEn: '2026-10-15T15:20:00Z',
    publicadaCliente: true,
    urlDescarga: `https://s3.example/fotos/${numero}.jpg`,
  };
}

export function planillaDetalle(estado: string, cambios: Record<string, unknown> = {}) {
  return {
    id: PLANILLA_103,
    obraId: OBRA_1,
    numero: 3,
    periodo: '2026-10',
    estado,
    version: 1,
    lineas: [
      {
        partidaId: 'b1000000-0000-4000-8000-000000000103',
        codigo: 'P-03',
        nombre: 'Cimientos de hormigón',
        unidad: 'm³',
        precioUnitario: 420.5,
        cantidadContratada: 850,
        acumuladoAnterior: 300,
        cantidadPeriodo: 120,
        acumuladoTotal: 420,
        saldo: 430,
        monto: 50460,
      },
    ],
    subtotal: 50460,
    descuentoAnticipo: 5046,
    retencion: 3532.2,
    neto: 41881.8,
    anticipoPct: 10,
    retencionPct: 7,
    observacion: null,
    cobroId: null,
    cobroNumero: null,
    fotoIds: [foto(1).id],
    ...cambios,
  };
}
