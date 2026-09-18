import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base './' permite publicar en Netlify desde cualquier ruta (subdirectorio o dominio propio).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});