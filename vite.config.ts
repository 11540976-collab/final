import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Handle environment variables safely for build process
// In a real environment (GitHub Actions), these will be injected via secrets.
// For local dev without env vars, these act as placeholders/undefined.
const apiKey = process.env.API_KEY ? JSON.stringify(process.env.API_KEY) : 'undefined';
const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.stringify(process.env.FIREBASE_CONFIG) : 'undefined';

export default defineConfig({
  plugins: [react()],
  base: './', // For GitHub Pages relative paths
  define: {
    // Inject specific keys instead of overwriting the whole process.env object
    // This preserves process.env.NODE_ENV which React relies on
    'process.env.API_KEY': apiKey,
    'process.env.FIREBASE_CONFIG': firebaseConfig
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