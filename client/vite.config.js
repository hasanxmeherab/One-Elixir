import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://one-elixir-backend.vercel.app'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      // Prevent accidental localhost API calls in production builds.
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core — tiny, loads first on every page
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Charts — only loaded on admin dashboard (lazy-loaded page)
            'vendor-charts': ['recharts'],
            // PDF/Excel export libs — only used in admin, loaded on demand
            'vendor-export': ['jspdf', 'jspdf-autotable', 'xlsx'],
            // Remaining shared third-party libs
            'vendor-misc': ['axios', 'lucide-react', 'react-select'],
          },
        },
      },
    },
  }
})