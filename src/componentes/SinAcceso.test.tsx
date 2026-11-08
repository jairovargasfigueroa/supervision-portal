import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tema } from '../tema';
import { SinAcceso } from './SinAcceso';

afterEach(cleanup);

describe('SinAcceso', () => {
  it('muestra el aviso con el nombre del usuario y cierra sesión al pulsar', () => {
    const alCerrarSesion = vi.fn();
    render(
      <ThemeProvider theme={tema}>
        <SinAcceso nombre="Daniela Roca Justiniano" alCerrarSesion={alCerrarSesion} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta aplicación' })).toBeTruthy();
    expect(screen.getByText('Daniela Roca Justiniano')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(alCerrarSesion).toHaveBeenCalledTimes(1);
  });
});
