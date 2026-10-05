import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'https://api-medica.rexcoresolutions.com';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1')
        },
        '/resources': {
          target: apiTarget,
          changeOrigin: true,
          secure: true
        }
      }
    }
  };
})
