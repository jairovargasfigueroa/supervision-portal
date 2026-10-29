import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ColumnDef, type RowData, tableFeatures, useTable } from '@tanstack/react-table';
import { Fragment, type ReactNode, useState } from 'react';
import { estiloNumero } from '../tema';

// Tabla común del portal: la lógica es de TanStack Table y el dibujo, de la Table de MUI (densidad normal).
// Pensada primero para el celular (docs/diseno-visual.md, «Pantallas chicas»): debajo de 600 px solo se ven las
// columnas esenciales y el resto se abre en un detalle desplegable por fila.

const caracteristicasTabla = tableFeatures({});
/** Características de TanStack Table que usa el portal (solo las del núcleo). Las columnas se declaran con
 * `createColumnHelper<CaracteristicasTabla, Fila>()`. */
export type CaracteristicasTabla = typeof caracteristicasTabla;

// `any`: cada columna tiene su propio tipo de valor (como en ColumnDef de TanStack Table)
// oxlint-disable-next-line no-explicit-any
export type ColumnaTabla<T extends RowData> = ColumnDef<CaracteristicasTabla, T, any>;

declare module '@tanstack/react-table' {
  interface ColumnMeta<TFeatures, TData, TValue> {
    /** Columna numérica: a la derecha y con cifras tabulares. */
    numerica?: boolean;
    /** En el celular no va en la fila: se ve en el detalle desplegable. */
    secundaria?: boolean;
  }
}

export interface TablaDatosProps<T extends RowData> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  /** Nombre de la tabla para lectores de pantalla. */
  etiqueta: string;
  /** Identificador estable de cada fila. */
  idFila: (fila: T) => string;
  /** Lo que se muestra si no hay filas. */
  vacio?: ReactNode;
  /** Fuerza la vista de celular (pruebas); si no, depende del ancho de la pantalla. */
  compacta?: boolean;
}

const estiloCeldaNumero = { ...estiloNumero, whiteSpace: 'nowrap' } as const;

export function TablaDatos<T extends RowData>({ columnas, filas, etiqueta, idFila, vacio, compacta }: TablaDatosProps<T>) {
  const tema = useTheme();
  const esCelular = useMediaQuery(tema.breakpoints.down('sm'));
  const celular = compacta ?? esCelular;
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set());

  const tabla = useTable({
    features: caracteristicasTabla,
    columns: columnas,
    data: filas,
    getRowId: (fila) => idFila(fila),
  });

  const esVisible = (secundaria: boolean | undefined) => !celular || !secundaria;
  const hayDetalle = celular && columnas.some((columna) => columna.meta?.secundaria);
  const cantidadColumnas = columnas.filter((columna) => esVisible(columna.meta?.secundaria)).length + (hayDetalle ? 1 : 0);
  const filasVisibles = tabla.getRowModel().rows;

  const alternar = (id: string) =>
    setAbiertas((anteriores) => {
      const nuevas = new Set(anteriores);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  return (
    <TableContainer>
      <Table aria-label={etiqueta}>
        <TableHead>
          {tabla.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id}>
              {grupo.headers
                .filter((encabezado) => esVisible(encabezado.column.columnDef.meta?.secundaria))
                .map((encabezado) => (
                  <TableCell
                    key={encabezado.id}
                    align={encabezado.column.columnDef.meta?.numerica ? 'right' : 'left'}
                    sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
                  >
                    {encabezado.isPlaceholder ? null : <tabla.FlexRender header={encabezado} />}
                  </TableCell>
                ))}
              {hayDetalle && <TableCell padding="checkbox" aria-label="Detalle" />}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {filasVisibles.map((fila) => {
            const celdas = fila.getAllCells();
            const abierta = abiertas.has(fila.id);
            return (
              <Fragment key={fila.id}>
                <TableRow sx={abierta ? { '& > td': { borderBottom: 0 } } : undefined}>
                  {celdas
                    .filter((celda) => esVisible(celda.column.columnDef.meta?.secundaria))
                    .map((celda) => {
                      const numerica = celda.column.columnDef.meta?.numerica;
                      return (
                        <TableCell
                          key={celda.id}
                          align={numerica ? 'right' : 'left'}
                          sx={numerica ? estiloCeldaNumero : undefined}
                        >
                          <tabla.FlexRender cell={celda} />
                        </TableCell>
                      );
                    })}
                  {hayDetalle && (
                    <TableCell padding="checkbox">
                      <IconButton
                        aria-label={abierta ? 'Ocultar detalle' : 'Ver detalle'}
                        aria-expanded={abierta}
                        onClick={() => alternar(fila.id)}
                        sx={{ width: 44, height: 44 }}
                      >
                        {abierta ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
                {hayDetalle && abierta && (
                  <TableRow>
                    <TableCell colSpan={cantidadColumnas} sx={{ pt: 0 }}>
                      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0.5 }}>
                        {celdas
                          .filter((celda) => celda.column.columnDef.meta?.secundaria)
                          .map((celda) => (
                            <Fragment key={celda.id}>
                              <Typography component="dt" variant="body2" color="text.secondary">
                                {String(celda.column.columnDef.header ?? '')}
                              </Typography>
                              <Typography
                                component="dd"
                                variant="body2"
                                sx={{ m: 0, textAlign: 'right', ...(celda.column.columnDef.meta?.numerica ? estiloNumero : {}) }}
                              >
                                <tabla.FlexRender cell={celda} />
                              </Typography>
                            </Fragment>
                          ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {filasVisibles.length === 0 && vacio && (
            <TableRow>
              <TableCell colSpan={cantidadColumnas} sx={{ p: 0, border: 0 }}>
                {vacio}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
