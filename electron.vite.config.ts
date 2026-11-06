import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: 'src/main/index.ts' },
    },
  },
  preload: {
    build: {
      rollupOptions: { input: 'src/preload/index.ts' },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': resolve('src/renderer') },
    },
    build: {
      rollupOptions: { input: 'src/renderer/index.html' },
    },
  },
})
