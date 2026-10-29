import Button from '@mui/material/Button';
import CardActionArea from '@mui/material/CardActionArea';
import { createLink } from '@tanstack/react-router';

// Componentes de MUI que navegan con TanStack Router (rutas tipadas y sin recargar la página).

/** Botón que es un enlace (por ejemplo, «← Mis obras»). */
export const BotonEnlace = createLink(Button);

/** Tarjeta entera clicable (obras y planillas de las listas). */
export const TarjetaEnlace = createLink(CardActionArea);
