import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { App } from './App.tsx';
import { leerConfiguracion } from './nucleo/configuracion.ts';
import { crearConfiguracionOidc } from './nucleo/sesion.ts';
import { tema } from './tema.ts';

// Variables validadas al iniciar: si falta alguna, la aplicación no arranca y el error dice cuál.
const configuracion = leerConfiguracion(import.meta.env);
const configuracionOidc = crearConfiguracionOidc(configuracion, window.location.origin);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...configuracionOidc}>
      <ThemeProvider theme={tema}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
