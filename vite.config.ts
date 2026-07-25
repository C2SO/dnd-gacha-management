import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Deployed to https://<user>.github.io/dnd-gacha-management/, so assets must be
// requested from that sub-path rather than the domain root.
export default defineConfig({
  base: '/dnd-gacha-management/',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
})
