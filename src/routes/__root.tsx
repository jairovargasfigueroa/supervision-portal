import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import { createRootRoute, Navigate, Outlet, useRouterState } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { hasAuthParams, useAuth } from 'react-oidc-context';
import { BarraSuperior } from '../componentes/BarraSuperior';
import { EstadoError } from '../componentes/EstadoError';
import { nombreDeRol, ROL_CLIENTE, tieneAcceso } from '../nucleo/roles';
import { leerUsuario } from '../nucleo/sesion';

export const Route = createRootRoute({ component: Raiz });

const RUTA_SIN_ACCESO = '/sin-acceso';

/**
 * Diseño del portal y protección de todas las rutas (001, criterios 1, 2, 3, 7, 8 y 11):
 * sin sesión inicia sesión en Keycloak; sin el rol `cliente` (contando solo los roles del `azp`) lleva a «Sin acceso».
 */
function Raiz() {
  const auth = useAuth();
  const ruta = useRouterState({ select: (estado) => estado.location.pathname });
  const yaPidioInicio = useRef(false);
  const { signinRedirect, signoutRedirect, events } = auth;

  const sinSesion = !auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator && !auth.error;

  // Sin sesión: al inicio de sesión de Keycloak (una sola vez; si vuelve de Keycloak con code y state, espera).
  useEffect(() => {
    if (sinSesion && !hasAuthParams() && !yaPidioInicio.current) {
      yaPidioInicio.current = true;
      void signinRedirect();
    }
  }, [sinSesion, signinRedirect]);

  // Si el token no se puede renovar solo, vuelve al inicio de sesión (criterio 8).
  useEffect(() => {
    const volverAIniciarSesion = () => void signinRedirect();
    const quitarErrorRenovacion = events.addSilentRenewError(volverAIniciarSesion);
    const quitarVencido = events.addAccessTokenExpired(volverAIniciarSesion);
    return () => {
      quitarErrorRenovacion();
      quitarVencido();
    };
  }, [events, signinRedirect]);

  if (auth.error && !auth.isAuthenticated) {
    return (
      <Diseno>
        <EstadoError alReintentar={() => void signinRedirect()} />
      </Diseno>
    );
  }

  const usuario = auth.isAuthenticated ? leerUsuario(auth.user) : null;
  if (!usuario) {
    return (
      <Diseno>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Iniciando sesión" />
        </Box>
      </Diseno>
    );
  }

  const cerrarSesion = () => void signoutRedirect();

  if (!tieneAcceso(usuario.roles, usuario.azp)) {
    if (ruta !== RUTA_SIN_ACCESO) return <Navigate to={RUTA_SIN_ACCESO} replace />;
    return (
      <Diseno>
        <Outlet />
      </Diseno>
    );
  }

  if (ruta === RUTA_SIN_ACCESO) return <Navigate to="/" replace />;
  return (
    <Diseno usuario={{ nombre: usuario.nombre, rol: nombreDeRol(ROL_CLIENTE) }} alCerrarSesion={cerrarSesion}>
      <Outlet />
    </Diseno>
  );
}

function Diseno({
  children,
  usuario,
  alCerrarSesion,
}: {
  children: ReactNode;
  usuario?: { nombre: string; rol: string };
  alCerrarSesion?: () => void;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <BarraSuperior usuario={usuario} alCerrarSesion={alCerrarSesion} />
      <Container component="main" maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
