import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Va antes que el de React: genera src/routeTree.gen.ts a partir de src/routes/ (las pruebas no son rutas).
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routeFileIgnorePattern: '\\.test\\.tsx?$' }),
    react(),
  ],
  server: { port: 4300, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Las pruebas de pantallas montan el portal entero: con todos los archivos en paralelo tardan más de 5 s.
    testTimeout: 20_000,
  },
})
