import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Foto } from '../api/obras';
import { tema } from '../tema';
import { BarraPorcentaje } from './BarraPorcentaje';
import { EstadoPlanillaChip } from './EstadoChip';
import { GaleriaFotos } from './GaleriaFotos';
import { type CaracteristicasTabla, TablaDatos } from './TablaDatos';

const conTema = (ui: ReactElement) => render(<ThemeProvider theme={tema}>{ui}</ThemeProvider>);

afterEach(cleanup);

describe('EstadoPlanillaChip', () => {
  it('muestra la etiqueta y el tono de cada estado', () => {
    conTema(
      <>
        <EstadoPlanillaChip estado="PRESENTADA" />
        <EstadoPlanillaChip estado="APROBANDO" />
        <EstadoPlanillaChip estado="APROBADA" />
        <EstadoPlanillaChip estado="OBSERVADA" />
      </>,
    );
    const tono = (texto: string) => screen.getByText(texto).closest('[data-tono]')?.getAttribute('data-tono');
    expect(tono('Presentada')).toBe('atencion');
    expect(tono('En aprobación')).toBe('atencion');
    expect(tono('Aprobada')).toBe('exito');
    expect(tono('Observada')).toBe('error');
  });
});

describe('BarraPorcentaje', () => {
  it('muestra el porcentaje y no pasa de 100 en la barra', () => {
    conTema(<BarraPorcentaje etiqueta="Avance físico" porcentaje={104.5} />);
    expect(screen.getByText('104,5 %')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Avance físico' }).getAttribute('aria-valuenow')).toBe('100');
  });
});

function foto(numero: number): Foto {
  return {
    id: `f${numero}`,
    partidaId: 'p1',
    registradoEn: '2026-11-15T18:30:00Z',
    publicadaCliente: true,
    urlDescarga: `https://s3.example/${numero}.jpg`,
  };
}

describe('GaleriaFotos', () => {
  it('muestra cada foto con partida y fecha, y la abre completa', () => {
    conTema(<GaleriaFotos fotos={[foto(1)]} nombrePartida={() => 'P-01 Losa'} vacio="Sin fotos." />);
    const imagen = screen.getByRole('img', { name: 'Foto de P-01 Losa · 15/11/2026' });
    expect(imagen.getAttribute('src')).toBe('https://s3.example/1.jpg');
    expect(imagen.closest('a')?.getAttribute('href')).toBe('https://s3.example/1.jpg');
    expect(screen.getByText('P-01 Losa · 15/11/2026')).toBeTruthy();
  });

  it('si la foto no carga, muestra un reemplazo en su lugar', () => {
    conTema(<GaleriaFotos fotos={[foto(1)]} nombrePartida={() => undefined} vacio="Sin fotos." />);
    fireEvent.error(screen.getByRole('img', { name: 'Foto de 15/11/2026' }));
    expect(screen.getByRole('img', { name: 'Foto no disponible: 15/11/2026' })).toBeTruthy();
  });

  it('sin fotos muestra el estado vacío', () => {
    conTema(<GaleriaFotos fotos={[]} nombrePartida={() => undefined} vacio="Aún no hay fotos de avance." />);
    expect(screen.getByRole('status').textContent).toContain('Aún no hay fotos de avance.');
  });

  it('ofrece «Cargar más fotos» solo si hay más', () => {
    const alPulsar = vi.fn();
    const { rerender } = conTema(
      <GaleriaFotos fotos={[foto(1)]} nombrePartida={() => undefined} vacio="" cargarMas={{ hayMas: true, cargando: false, alPulsar }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más fotos' }));
    expect(alPulsar).toHaveBeenCalledTimes(1);
    rerender(
      <ThemeProvider theme={tema}>
        <GaleriaFotos fotos={[foto(1)]} nombrePartida={() => undefined} vacio="" cargarMas={{ hayMas: false, cargando: false, alPulsar }} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Cargar más fotos' })).toBeNull();
  });
});

interface Fila {
  id: string;
  partida: string;
  monto: number;
  saldo: number;
}

const columna = createColumnHelper<CaracteristicasTabla, Fila>();
const columnas = [
  columna.accessor('partida', { header: 'Partida' }),
  columna.accessor('saldo', { header: 'Saldo', meta: { numerica: true, secundaria: true } }),
  columna.accessor('monto', { header: 'Monto', meta: { numerica: true } }),
];
const filas: Fila[] = [{ id: 'a', partida: 'Losa', monto: 100, saldo: 30 }];

describe('TablaDatos', () => {
  it('en pantallas grandes muestra todas las columnas', () => {
    conTema(<TablaDatos etiqueta="Líneas" columnas={columnas} filas={filas} idFila={(fila) => fila.id} />);
    const tabla = screen.getByRole('table', { name: 'Líneas' });
    expect(within(tabla).getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual(['Partida', 'Saldo', 'Monto']);
    expect(within(tabla).queryByRole('button', { name: 'Ver detalle' })).toBeNull();
  });

  it('en el celular deja las esenciales y abre el resto en un detalle desplegable', () => {
    conTema(<TablaDatos etiqueta="Líneas" columnas={columnas} filas={filas} idFila={(fila) => fila.id} compacta />);
    const tabla = screen.getByRole('table', { name: 'Líneas' });
    expect(within(tabla).getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual(['Partida', 'Monto', '']);
    expect(within(tabla).queryByText('30')).toBeNull();

    fireEvent.click(within(tabla).getByRole('button', { name: 'Ver detalle' }));
    expect(within(tabla).getByText('Saldo')).toBeTruthy();
    expect(within(tabla).getByText('30')).toBeTruthy();
    fireEvent.click(within(tabla).getByRole('button', { name: 'Ocultar detalle' }));
    expect(within(tabla).queryByText('30')).toBeNull();
  });

  it('sin filas muestra lo indicado', () => {
    conTema(<TablaDatos etiqueta="Líneas" columnas={columnas} filas={[]} idFila={(fila) => fila.id} vacio="Nada" />);
    expect(screen.getByText('Nada')).toBeTruthy();
  });
});
