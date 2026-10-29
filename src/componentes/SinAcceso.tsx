import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export interface SinAccesoProps {
  /** Nombre del usuario con sesión. */
  nombre: string;
  /** Se llama al pulsar «Cerrar sesión». */
  alCerrarSesion: () => void;
}

/** Pantalla para quien inició sesión sin el rol `cliente` (001, criterio 3; docs/mensajes.md, «Sesión y acceso»). */
export function SinAcceso({ nombre, alCerrarSesion }: SinAccesoProps) {
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
        py: 6,
        px: 2,
      }}
    >
      <BlockOutlinedIcon aria-hidden sx={{ fontSize: 48, color: 'text.secondary' }} />
      <Typography variant="h1" component="h1">
        No tienes acceso a esta aplicación
      </Typography>
      {nombre && <Typography color="text.secondary">{nombre}</Typography>}
      <Button variant="contained" onClick={alCerrarSesion}>
        Cerrar sesión
      </Button>
    </Box>
  );
}
