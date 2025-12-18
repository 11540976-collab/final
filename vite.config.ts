import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Handle environment variables safely for build process
// In a real environment (GitHub Actions), these will be injected via secrets.
// For local dev without env vars, these act as placeholders/undefined.
const processEnv = {
  API_KEY: process.env.API_KEY ? JSON.stringify(process.env.API_KEY) : 'undefined',
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? JSON.stringify(process.env.FIREBASE_CONFIG) : 'undefined'
};

export default defineConfig({
  plugins: [react()],
  base: './', // For GitHub Pages relative paths
  define: {
    'process.env': processEnv
  },
  build: {
    minify: 'terser', // Explicitly use terser as requested
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging if needed
      },
    },
  },
});