import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export interface BarraSuperiorProps {
  /** Usuario con acceso al portal; sin él, la barra muestra solo el título. */
  usuario?: { nombre: string; rol: string };
  alCerrarSesion?: () => void;
}

/** Barra superior del portal: título, nombre y rol del usuario y «Cerrar sesión» (001, criterios 7 y 11). */
export function BarraSuperior({ usuario, alCerrarSesion }: BarraSuperiorProps) {
  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, gap: 2 }}>
        <Typography variant="h2" component="div" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
          Portal del cliente
        </Typography>
        {usuario && (
          <>
            <Box sx={{ minWidth: 0, textAlign: 'right' }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {usuario.nombre}
              </Typography>
              <Typography variant="caption" component="div" noWrap sx={{ opacity: 0.8 }}>
                {usuario.rol}
              </Typography>
            </Box>
            <Button color="inherit" variant="outlined" onClick={alCerrarSesion} sx={{ flexShrink: 0 }}>
              Cerrar sesión
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
