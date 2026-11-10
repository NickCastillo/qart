import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // Living Scene Studio: single page hosting the four scenes in one canvas
        studio: fileURLToPath(new URL('./studio.html', import.meta.url)),
      },
    },
  },
})
