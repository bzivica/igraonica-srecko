import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Base path: lokalne '/', pri deployi na GitHub Pages nastav env VITE_BASE
// (napr. '/herna-rezervace/') ve workflow.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Igraonica Srećko - rezervace',
        short_name: 'Srećko',
        description: 'Rezervace termínů v herně Igraonica Srećko',
        theme_color: '#7c3aed',
        background_color: '#faf5ff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
