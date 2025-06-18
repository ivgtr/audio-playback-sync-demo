import { defineConfig } from 'vite'

export default defineConfig({
  base: '/audio-playback-sync-demo/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 3000
  }
})