import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { crearClienteConsultas, ProveedorClienteObras } from './api/cliente.ts';
import { cargarConfiguracion } from './nucleo/configuracion.ts';
import { crearConfiguracionOidc } from './nucleo/sesion.ts';
import { routeTree } from './routeTree.gen.ts';
import { tema } from './tema.ts';

const clienteConsultas = crearClienteConsultas();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// 601: configuracion.json (al publicar) antes de montar React; en desarrollo, .env. Si un valor no es válido, la
// aplicación no arranca y el error dice cuál.
async function iniciar() {
  const configuracion = await cargarConfiguracion(import.meta.env);
  const configuracionOidc = crearConfiguracionOidc(configuracion, window.location.origin);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider {...configuracionOidc}>
        <ProveedorClienteObras urlBase={configuracion.obrasUrl}>
          <QueryClientProvider client={clienteConsultas}>
            <ThemeProvider theme={tema}>
              <CssBaseline />
              <RouterProvider router={router} />
            </ThemeProvider>
          </QueryClientProvider>
        </ProveedorClienteObras>
      </AuthProvider>
    </StrictMode>,
  );
}

iniciar().catch((error: unknown) => console.error(error));
