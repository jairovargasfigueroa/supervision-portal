import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // El plugin del router va antes que el de React: genera src/routeTree.gen.ts a partir de src/routes/.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  server: { port: 4300, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
