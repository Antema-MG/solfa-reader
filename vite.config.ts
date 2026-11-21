import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { catalogWriter } from './tools/catalogWriter'

export default defineConfig({
  // ngrok tunnels for testing on a phone (leading dot = any subdomain, survives new tunnel URLs).
  server: { allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'] },
  plugins: [
    react(),
    catalogWriter(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Msolfa Player',
        short_name: 'Msolfa',
        description: 'Lecteur et éditeur de partitions .msolfa',
        theme_color: '#1e1e2e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
