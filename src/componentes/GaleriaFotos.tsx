import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { Foto } from '../api/obras';
import { formatearFecha } from '../nucleo/formato';
import { EstadoVacio } from './EstadoVacio';

export interface GaleriaFotosProps {
  fotos: Foto[];
  /** Nombre de la partida de cada foto (para el pie). */
  nombrePartida: (partidaId: string) => string | undefined;
  /** Texto cuando no hay fotos. */
  vacio: string;
  /** «Cargar más fotos» cuando la lista tiene más páginas. */
  cargarMas?: { hayMas: boolean; cargando: boolean; alPulsar: () => void };
}

/** Galería de fotos publicadas para el cliente: miniatura, partida y fecha; al pulsar se abre la foto completa. */
export function GaleriaFotos({ fotos, nombrePartida, vacio, cargarMas }: GaleriaFotosProps) {
  if (fotos.length === 0) return <EstadoVacio mensaje={vacio} />;
  return (
    <Box>
      <Box
        component="ul"
        aria-label="Fotos"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(200px, 1fr))' },
        }}
      >
        {fotos.map((foto) => (
          <Box component="li" key={foto.id}>
            <Miniatura foto={foto} partida={nombrePartida(foto.partidaId)} />
          </Box>
        ))}
      </Box>
      {cargarMas?.hayMas && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="outlined" onClick={cargarMas.alPulsar} disabled={cargarMas.cargando}>
            {cargarMas.cargando ? 'Cargando…' : 'Cargar más fotos'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function Miniatura({ foto, partida }: { foto: Foto; partida: string | undefined }) {
  const [fallo, setFallo] = useState(false);
  const fecha = formatearFecha(foto.registradoEn);
  const pie = partida ? `${partida} · ${fecha}` : fecha;
  return (
    <Box
      component="figure"
      sx={{ m: 0, border: 1, borderColor: 'divider', borderRadius: '10px', overflow: 'hidden', bgcolor: 'background.paper' }}
    >
      {fallo ? (
        <Box
          role="img"
          aria-label={`Foto no disponible: ${pie}`}
          sx={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}
        >
          <BrokenImageOutlinedIcon aria-hidden sx={{ color: 'text.secondary' }} />
        </Box>
      ) : (
        <a href={foto.urlDescarga} target="_blank" rel="noreferrer">
          <Box
            component="img"
            src={foto.urlDescarga}
            alt={`Foto de ${pie}`}
            loading="lazy"
            onError={() => setFallo(true)}
            sx={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
          />
        </a>
      )}
      <Typography component="figcaption" variant="caption" sx={{ display: 'block', px: 1.25, py: 1 }}>
        {pie}
      </Typography>
    </Box>
  );
}
