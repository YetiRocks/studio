import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/studio/',
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
  ],
  resolve: {},
  build: {
    outDir: '../web',
    emptyOutDir: true,
  },
  server: {
    fs: { allow: ['..'] },
    port: 5177,
    proxy: {
      '/yeti-applications': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/yeti-auth': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/yeti-telemetry': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/yeti-vectors': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/yeti-benchmarks': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
