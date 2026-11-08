import Paper from '@mui/material/Paper';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from 'react-oidc-context';
import { SinAcceso } from '../componentes/SinAcceso';
import { leerUsuario } from '../nucleo/sesion';

// Solo llega aquí quien tiene sesión sin el rol `cliente`; la protección está en __root.tsx (001, criterio 3).
export const Route = createFileRoute('/sin-acceso')({ component: PantallaSinAcceso });

function PantallaSinAcceso() {
  const auth = useAuth();
  const usuario = leerUsuario(auth.user);
  return (
    <Paper variant="outlined">
      <SinAcceso nombre={usuario?.nombre ?? ''} alCerrarSesion={() => void auth.signoutRedirect()} />
    </Paper>
  );
}
