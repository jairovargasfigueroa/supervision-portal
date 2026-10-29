import { ThemeProvider } from '@mui/material/styles';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AuthContextProps, hasAuthParams, useAuth } from 'react-oidc-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '../routeTree.gen';
import { tema } from '../tema';

// Se simula react-oidc-context: cada prueba decide el estado de la sesión que devuelve useAuth.
vi.mock('react-oidc-context', () => ({ useAuth: vi.fn(), hasAuthParams: vi.fn(() => false) }));

/** Token de prueba sin firma (el portal solo lee su contenido). */
function tokenDePrueba(datos: Record<string, unknown>): string {
  const base64url = (texto: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(datos))}.firma`;
}

function usuarioDePrueba(nombre: string, roles: string[], azp = 'portal') {
  return {
    access_token: tokenDePrueba({ sub: 'id-de-prueba', azp, realm_access: { roles: ['default-roles-supervision', ...roles] } }),
    profile: { sub: 'id-de-prueba', name: nombre },
    expired: false,
  };
}

let alFallarRenovacion: (() => void) | undefined;
let alVencerToken: (() => void) | undefined;

function sesion(parcial: Partial<Record<keyof AuthContextProps, unknown>> = {}) {
  const auth = {
    isLoading: false,
    isAuthenticated: false,
    activeNavigator: undefined,
    error: undefined,
    user: null,
    signinRedirect: vi.fn(() => Promise.resolve()),
    signoutRedirect: vi.fn(() => Promise.resolve()),
    events: {
      addSilentRenewError: vi.fn((alFallar: () => void) => {
        alFallarRenovacion = alFallar;
        return () => {};
      }),
      addAccessTokenExpired: vi.fn((alVencer: () => void) => {
        alVencerToken = alVencer;
        return () => {};
      }),
    },
    ...parcial,
  };
  vi.mocked(useAuth).mockReturnValue(auth as unknown as AuthContextProps);
  return auth;
}

const conSesion = (nombre: string, roles: string[], azp?: string) =>
  sesion({ isAuthenticated: true, user: usuarioDePrueba(nombre, roles, azp) });

function montar(ruta = '/') {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [ruta] }) });
  render(
    <ThemeProvider theme={tema}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
  return router;
}

beforeEach(() => {
  // jsdom no implementa scrollTo, que el router usa al cambiar de ruta.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(hasAuthParams).mockReturnValue(false);
  alFallarRenovacion = undefined;
  alVencerToken = undefined;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('ruta protegida', () => {
  it('sin sesión lleva al inicio de sesión de Keycloak una sola vez', async () => {
    const auth = sesion();
    montar();
    await waitFor(() => expect(auth.signinRedirect).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Mis obras')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });

  it('mientras carga la sesión o vuelve de Keycloak con code y state, no pide otro inicio de sesión', async () => {
    const cargando = sesion({ isLoading: true });
    montar();
    expect(await screen.findByLabelText('Iniciando sesión')).toBeTruthy();
    expect(cargando.signinRedirect).not.toHaveBeenCalled();
    cleanup();

    vi.mocked(hasAuthParams).mockReturnValue(true);
    const volviendo = sesion();
    montar();
    expect(await screen.findByLabelText('Iniciando sesión')).toBeTruthy();
    expect(volviendo.signinRedirect).not.toHaveBeenCalled();
  });

  it('con el rol cliente entra a Mis obras y la barra muestra nombre y rol', async () => {
    const auth = conSesion('Roberto Justiniano Paz', ['cliente']);
    const router = montar();
    expect(await screen.findByRole('heading', { name: 'Mis obras' })).toBeTruthy();
    expect(screen.getByText('Roberto Justiniano Paz')).toBeTruthy();
    expect(screen.getByText('Cliente')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/');
    expect(auth.signinRedirect).not.toHaveBeenCalled();
  });

  it('un usuario residente y cliente (demo1) entra como cliente', async () => {
    conSesion('Lucía Paz Antelo', ['residente', 'cliente']);
    montar();
    expect(await screen.findByRole('heading', { name: 'Mis obras' })).toBeTruthy();
    expect(screen.getByText('Cliente')).toBeTruthy();
    expect(screen.queryByText('Residente')).toBeNull();
  });

  it('sin el rol cliente ve «No tienes acceso a esta aplicación» con su nombre', async () => {
    conSesion('Daniela Roca Justiniano', ['residente']);
    const router = montar();
    expect(await screen.findByRole('heading', { name: 'No tienes acceso a esta aplicación' })).toBeTruthy();
    expect(screen.getByText('Daniela Roca Justiniano')).toBeTruthy();
    expect(screen.queryByText('Mis obras')).toBeNull();
    expect(router.state.location.pathname).toBe('/sin-acceso');
  });

  it('con un token de otra aplicación tampoco entra aunque tenga cliente', async () => {
    conSesion('Lucía Paz Antelo', ['residente', 'cliente'], 'erp');
    montar();
    expect(await screen.findByRole('heading', { name: 'No tienes acceso a esta aplicación' })).toBeTruthy();
  });

  it('con el rol cliente no se queda en /sin-acceso', async () => {
    conSesion('Roberto Justiniano Paz', ['cliente']);
    const router = montar('/sin-acceso');
    expect(await screen.findByRole('heading', { name: 'Mis obras' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/');
  });

  it('«Cerrar sesión» de la barra llama a signoutRedirect', async () => {
    const auth = conSesion('Roberto Justiniano Paz', ['cliente']);
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(auth.signoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('«Cerrar sesión» de SinAcceso llama a signoutRedirect', async () => {
    const auth = conSesion('Daniela Roca Justiniano', ['residente']);
    montar();
    await screen.findByRole('heading', { name: 'No tienes acceso a esta aplicación' });
    const botones = screen.getAllByRole('button', { name: 'Cerrar sesión' });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]!);
    expect(auth.signoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('si el token no se puede renovar o vence, vuelve al inicio de sesión', async () => {
    const auth = conSesion('Roberto Justiniano Paz', ['cliente']);
    montar();
    await screen.findByRole('heading', { name: 'Mis obras' });
    expect(auth.signinRedirect).not.toHaveBeenCalled();
    alFallarRenovacion?.();
    expect(auth.signinRedirect).toHaveBeenCalledTimes(1);
    alVencerToken?.();
    expect(auth.signinRedirect).toHaveBeenCalledTimes(2);
  });

  it('si Keycloak no responde, muestra el error y reintenta el inicio de sesión', async () => {
    const auth = sesion({ error: new Error('Failed to fetch') });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(auth.signinRedirect).toHaveBeenCalledTimes(1);
  });
});
