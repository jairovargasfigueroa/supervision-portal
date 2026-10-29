import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export interface EstadoErrorProps {
  /** Se llama al pulsar «Reintentar». */
  alReintentar: () => void;
  /** Texto del error; por defecto «No disponible por el momento.» */
  mensaje?: string;
}

/** Estado de error de un área: mensaje y «Reintentar» (docs/diseno-visual.md). */
export function EstadoError({ alReintentar, mensaje = 'No disponible por el momento.' }: EstadoErrorProps) {
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
      <ErrorOutlineIcon aria-hidden sx={{ fontSize: 48, color: 'error.main' }} />
      <Typography>{mensaje}</Typography>
      <Button variant="outlined" onClick={alReintentar}>
        Reintentar
      </Button>
    </Box>
  );
}
