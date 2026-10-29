import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export interface EstadoVacioProps {
  /** Texto del estado vacío, por ejemplo «Aún no hay obras.» */
  mensaje: string;
  /** Acción opcional (botón debajo del texto). */
  accion?: { texto: string; alPulsar: () => void };
}

/** Estado vacío de un área: texto y acción opcional (docs/diseno-visual.md). */
export function EstadoVacio({ mensaje, accion }: EstadoVacioProps) {
  return (
    <Box
      role="status"
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
      <InboxOutlinedIcon aria-hidden sx={{ fontSize: 48, color: 'text.secondary' }} />
      <Typography color="text.secondary">{mensaje}</Typography>
      {accion && (
        <Button variant="contained" onClick={accion.alPulsar}>
          {accion.texto}
        </Button>
      )}
    </Box>
  );
}
