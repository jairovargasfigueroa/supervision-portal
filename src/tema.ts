// Tema del portal según docs/diseno-visual.md («Colores», «Tipografía», «Forma y espacios»,
// «Implementación del tema»). Mismos valores que mf-materiales y mf-supervision. Solo tema claro.
import { createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

/** Tokens de color de docs/diseno-visual.md, para lo que la paleta de MUI no cubre (fondos suaves de chips y avisos). */
export const colores = {
  primario: '#0E4D5C',
  primarioOscuro: '#0A3741',
  primarioSuave: '#E2EEF1',
  acento: '#F08A24',
  acentoSuave: '#FDEEDC',
  texto: '#14232A',
  textoSecundario: '#56676F',
  borde: '#DAE2E5',
  fondo: '#F2F5F6',
  superficie: '#FFFFFF',
  exito: '#1B7343',
  exitoSuave: '#E2F3E9',
  atencion: '#9A4A00',
  atencionSuave: '#FDEEDC',
  error: '#B42318',
  errorSuave: '#FCE8E6',
} as const;

const fuenteTexto = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const fuenteNumeros = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

/** Estilo para números en tablas y montos: IBM Plex Mono con cifras de ancho fijo. */
export const estiloNumero: CSSProperties = {
  fontFamily: fuenteNumeros,
  fontVariantNumeric: 'tabular-nums',
};

declare module '@mui/material/styles' {
  interface TypographyVariants {
    numero: CSSProperties;
  }
  interface TypographyVariantsOptions {
    numero?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    numero: true;
  }
}

export const tema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colores.primario, dark: colores.primarioOscuro, contrastText: colores.superficie },
    secondary: { main: colores.acento, contrastText: colores.texto },
    success: { main: colores.exito, contrastText: colores.superficie },
    warning: { main: colores.atencion, contrastText: colores.superficie },
    error: { main: colores.error, contrastText: colores.superficie },
    text: { primary: colores.texto, secondary: colores.textoSecundario },
    divider: colores.borde,
    background: { default: colores.fondo, paper: colores.superficie },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: fuenteTexto,
    fontSize: 14,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    // Escala: títulos de página 24 px/600, de sección 18 px/600, texto 14 px/400, ayudas 12 px.
    h1: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
    h2: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    button: { fontWeight: 500, textTransform: 'none' },
    numero: { ...estiloNumero, fontSize: '0.875rem' },
  },
  components: {
    MuiTypography: {
      defaultProps: { variantMapping: { numero: 'span' } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 6, minHeight: 44 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 999 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 10 } },
    },
  },
});
