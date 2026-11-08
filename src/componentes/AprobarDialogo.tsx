import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { formatearMonto } from '../nucleo/formato';

export interface AprobarDialogoProps {
  abierto: boolean;
  numero: number;
  neto: number;
  /** Mientras Obras recibe la aprobación. */
  enviando: boolean;
  /** Mensaje de error del último intento. */
  error?: string;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/** Confirmación antes de aprobar (008, criterio 5; texto de docs/mensajes.md). */
export function AprobarDialogo({ abierto, numero, neto, enviando, error, alConfirmar, alCancelar }: AprobarDialogoProps) {
  return (
    <Dialog
      open={abierto}
      onClose={enviando ? undefined : alCancelar}
      fullWidth
      maxWidth="xs"
      aria-labelledby="titulo-aprobar"
      aria-describedby="texto-aprobar"
    >
      <DialogTitle id="titulo-aprobar">Aprobar planilla</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <DialogContentText id="texto-aprobar">
            ¿Aprobar la planilla N.º {numero} por {formatearMonto(neto)}? Se emitirá el cobro.
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={alCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="contained" color="success" onClick={alConfirmar} disabled={enviando}>
          {enviando ? 'Aprobando…' : 'Aprobar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
