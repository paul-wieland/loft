import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'

// The version from package.json, shown in the sidebar.
const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }

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
    define: { __APP_VERSION__: JSON.stringify(version) },
    resolve: {
      alias: { '@': resolve('src/renderer') },
    },
    build: {
      rollupOptions: { input: 'src/renderer/index.html' },
    },
  },
})
