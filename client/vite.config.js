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
  }
})