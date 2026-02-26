import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  preview: {
    allowedHosts: ['parkit-4jjt.onrender.com']
    // OR use 'all'
    // allowedHosts: 'all'
  },

  build: {
    chunkSizeWarningLimit: 1000,
  },
})
