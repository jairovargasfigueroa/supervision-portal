import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../api/cliente';
import { tema } from '../tema';
import { AprobarDialogo } from './AprobarDialogo';
import { ObservarDialogo } from './ObservarDialogo';

const conTema = (ui: ReactElement) => render(<ThemeProvider theme={tema}>{ui}</ThemeProvider>);
const REGLA = 'El motivo debe tener entre 10 y 500 caracteres.';

afterEach(cleanup);

describe('AprobarDialogo', () => {
  it('pregunta con el número y el neto, y confirma o cancela', () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    conTema(
      <AprobarDialogo abierto numero={3} neto={41881.8} enviando={false} alConfirmar={alConfirmar} alCancelar={alCancelar} />,
    );
    const dialogo = screen.getByRole('dialog', { name: 'Aprobar planilla' });
    expect(within(dialogo).getByText('¿Aprobar la planilla N.º 3 por Bs 41.881,80? Se emitirá el cobro.')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(alConfirmar).toHaveBeenCalledTimes(1);
    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  it('mientras envía no deja pulsar y muestra el error del intento anterior', () => {
    conTema(
      <AprobarDialogo
        abierto
        numero={3}
        neto={10}
        enviando
        error="No hay conexión con el servidor."
        alConfirmar={() => {}}
        alCancelar={() => {}}
      />,
    );
    expect((screen.getByRole('button', { name: 'Aprobando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('No hay conexión con el servidor.');
  });
});

describe('ObservarDialogo', () => {
  function montar(alEnviar = vi.fn(async (_motivo: string) => {})) {
    conTema(<ObservarDialogo abierto numero={3} alEnviar={alEnviar} alCancelar={() => {}} />);
    const dialogo = screen.getByRole('dialog', { name: 'Observar planilla N.º 3' });
    return { dialogo, campo: within(dialogo).getByRole('textbox', { name: /Motivo/ }), alEnviar };
  }

  it('no envía un motivo vacío y muestra la regla', async () => {
    const { dialogo, alEnviar } = montar();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(await within(dialogo).findByText(REGLA)).toBeTruthy();
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('cuenta los caracteres y valida de 10 a 500 sin contar los espacios de los extremos', async () => {
    const { dialogo, campo, alEnviar } = montar();
    expect(within(dialogo).getByText('0 / 500')).toBeTruthy();
    expect(within(dialogo).getByText('Mínimo 10 caracteres')).toBeTruthy();

    fireEvent.change(campo, { target: { value: '   123456789   ' } });
    fireEvent.blur(campo);
    expect(within(dialogo).getByText('9 / 500')).toBeTruthy();
    expect(await within(dialogo).findByText(REGLA)).toBeTruthy();

    fireEvent.change(campo, { target: { value: '1234567890' } });
    expect(within(dialogo).getByText('10 / 500')).toBeTruthy();
    await waitFor(() => expect(within(dialogo).queryByText(REGLA)).toBeNull());

    fireEvent.change(campo, { target: { value: 'a'.repeat(500) } });
    expect(within(dialogo).getByText('500 / 500')).toBeTruthy();
    expect(within(dialogo).queryByText(REGLA)).toBeNull();

    fireEvent.change(campo, { target: { value: 'a'.repeat(501) } });
    expect(await within(dialogo).findByText(REGLA)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('envía el motivo sin los espacios de los extremos', async () => {
    const { dialogo, campo, alEnviar } = montar();
    fireEvent.change(campo, { target: { value: '  Falta adjuntar fotos de los vaciados  ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    await waitFor(() => expect(alEnviar).toHaveBeenCalledWith('Falta adjuntar fotos de los vaciados'));
  });

  it('si Obras responde con error, muestra el mensaje del catálogo', async () => {
    const alEnviar = vi.fn(async () => {
      throw new ErrorApi({ tipo: 'respuesta', estado: 409, codigo: 'PLANILLA_NO_PRESENTADA' });
    });
    const { dialogo, campo } = montar(alEnviar);
    fireEvent.change(campo, { target: { value: 'Un motivo suficientemente largo' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Observar' }));
    expect(
      await within(dialogo).findByText('Esta planilla ya no está esperando tu revisión. Recarga para ver su estado actual.'),
    ).toBeTruthy();
  });
});
