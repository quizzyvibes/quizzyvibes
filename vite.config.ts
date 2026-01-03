import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // In production, Vercel handles the API routing automatically.
  // In local development, we need to run the API separately or mock it, 
  // OR use 'vercel dev' command. 
  // For simplicity in this codebase, we assume deployment to Vercel.
  define: {
    // We don't need process.env.API_KEY in the client anymore!
  }
})