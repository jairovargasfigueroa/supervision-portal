import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import { ErrorApi } from '../api/cliente';
import { MOTIVO_MAXIMO, MOTIVO_MINIMO } from '../api/planillas';
import { mensajeDeError } from '../nucleo/errores';

const MENSAJE_MOTIVO = 'El motivo debe tener entre 10 y 500 caracteres.';

/** Motivo obligatorio de 10 a 500 caracteres, sin contar los espacios de los extremos (008, criterio 4). */
const esquemaObservacion = z.object({
  motivo: z.string().trim().min(MOTIVO_MINIMO, MENSAJE_MOTIVO).max(MOTIVO_MAXIMO, MENSAJE_MOTIVO),
});

export interface ObservarDialogoProps {
  abierto: boolean;
  numero: number;
  /** Envía el motivo (ya sin espacios en los extremos). Si falla, lanza el error de la API. */
  alEnviar: (motivo: string) => Promise<void>;
  alCancelar: () => void;
}

function primerError(errores: readonly unknown[]): string | undefined {
  const error = errores[0];
  if (!error) return undefined;
  return typeof error === 'string' ? error : (error as { message?: string }).message;
}

/** Diálogo para observar la planilla con un motivo y su contador «{n} / 500». */
export function ObservarDialogo({ abierto, numero, alEnviar, alCancelar }: ObservarDialogoProps) {
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [errorCampo, setErrorCampo] = useState<string>();

  const formulario = useForm({
    defaultValues: { motivo: '' },
    validators: { onChange: esquemaObservacion, onSubmit: esquemaObservacion },
    onSubmit: async ({ value }) => {
      setErrorGeneral(undefined);
      setErrorCampo(undefined);
      try {
        await alEnviar(value.motivo.trim());
      } catch (error) {
        setErrorGeneral(mensajeDeError(error));
        if (error instanceof ErrorApi) setErrorCampo(error.errores.find((e) => e.campo === 'motivo')?.mensaje);
      }
    },
  });

  const limpiar = () => {
    formulario.reset();
    setErrorGeneral(undefined);
    setErrorCampo(undefined);
  };

  return (
    <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
      {(enviando) => (
        <Dialog
          open={abierto}
          onClose={enviando ? undefined : alCancelar}
          fullWidth
          maxWidth="sm"
          aria-labelledby="titulo-observar"
          slotProps={{ transition: { onExited: limpiar } }}
        >
          <form
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault();
              void formulario.handleSubmit();
            }}
          >
            <DialogTitle id="titulo-observar">Observar planilla N.º {numero}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}
                <formulario.Field name="motivo">
                  {(campo) => {
                    // El error se ve recién cuando la persona tocó el campo o intentó enviar (que marca todos).
                    const error = (campo.state.meta.isTouched ? primerError(campo.state.meta.errors) : undefined) ?? errorCampo;
                    const largo = campo.state.value.trim().length;
                    return (
                      <TextField
                        label="Motivo"
                        required
                        multiline
                        minRows={4}
                        fullWidth
                        autoFocus
                        name={campo.name}
                        value={campo.state.value}
                        onChange={(evento) => campo.handleChange(evento.target.value)}
                        onBlur={campo.handleBlur}
                        error={!!error}
                        helperText={
                          <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <span>{error ?? `Mínimo ${MOTIVO_MINIMO} caracteres`}</span>
                            <span>{`${largo} / ${MOTIVO_MAXIMO}`}</span>
                          </Box>
                        }
                      />
                    );
                  }}
                </formulario.Field>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={alCancelar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="error" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Observar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </formulario.Subscribe>
  );
}
