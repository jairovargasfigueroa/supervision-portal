import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tema } from '../tema';
import { EstadoError } from './EstadoError';
import { EstadoVacio } from './EstadoVacio';

const conTema = (ui: ReactElement) => render(<ThemeProvider theme={tema}>{ui}</ThemeProvider>);

afterEach(cleanup);

describe('EstadoVacio', () => {
  it('muestra el texto sin botón cuando no hay acción', () => {
    conTema(<EstadoVacio mensaje="Aún no hay obras." />);
    expect(screen.getByRole('status').textContent).toContain('Aún no hay obras.');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra la acción y la ejecuta al pulsarla', () => {
    const alPulsar = vi.fn();
    conTema(<EstadoVacio mensaje="Aún no hay obras." accion={{ texto: 'Ver ayuda', alPulsar }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver ayuda' }));
    expect(alPulsar).toHaveBeenCalledTimes(1);
  });
});

describe('EstadoError', () => {
  it('muestra «No disponible por el momento.» y reintenta al pulsar', () => {
    const alReintentar = vi.fn();
    conTema(<EstadoError alReintentar={alReintentar} />);
    expect(screen.getByRole('alert').textContent).toContain('No disponible por el momento.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(alReintentar).toHaveBeenCalledTimes(1);
  });

  it('acepta otro mensaje', () => {
    conTema(<EstadoError alReintentar={() => {}} mensaje="Este servicio no está disponible por el momento." />);
    expect(screen.getByRole('alert').textContent).toContain('Este servicio no está disponible por el momento.');
  });
});
