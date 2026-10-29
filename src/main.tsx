import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { leerConfiguracion } from './nucleo/configuracion.ts';
import { crearConfiguracionOidc } from './nucleo/sesion.ts';
import { routeTree } from './routeTree.gen.ts';
import { tema } from './tema.ts';

// Variables validadas al iniciar: si falta alguna, la aplicación no arranca y el error dice cuál.
const configuracion = leerConfiguracion(import.meta.env);
const configuracionOidc = crearConfiguracionOidc(configuracion, window.location.origin);

const clienteConsultas = new QueryClient();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...configuracionOidc}>
      <QueryClientProvider client={clienteConsultas}>
        <ThemeProvider theme={tema}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
