import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { EstadoVacio } from './componentes/EstadoVacio';

// Pantalla base de la fase 1, pensada primero para celular (docs/diseno-visual.md, «Pantallas chicas»).
// Cuando llegue TanStack Router, la barra pasa a routes/__root.tsx y el contenido a routes/index.tsx.
export function App() {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="h2" component="div" noWrap>
            Portal del cliente
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        <Typography variant="h1" sx={{ mb: 2 }}>
          Mis obras
        </Typography>
        <Paper variant="outlined">
          <EstadoVacio mensaje="Aún no hay obras para mostrar." />
        </Paper>
      </Container>
    </Box>
  );
}
