import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  base: './',
  //force local cache
  cacheDir: path.resolve(import.meta.dirname, 'node_modules/.vite'),

  build: {
    rolldownOptions: {
      output: {
        // Put large libraries in their own JavaScript files.
        // Stylesheets are not matched, so styles stay as they were.
        codeSplitting: {
          groups: [
            // Firestore is listed first so it gets its own file.
            { name: 'firestore', priority: 2, test: /node_modules[\\/](@firebase[\\/](firestore|webchannel-wrapper)|firebase[\\/]firestore)[\\/].*\.[cm]?js$/ },
            { name: 'firebase', priority: 1, test: /node_modules[\\/]@?firebase[\\/].*\.[cm]?js$/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/].*\.[cm]?js$/ },
            { name: 'sign-in', test: /node_modules[\\/](@firebase-oss|libphonenumber-js|zod|nanostores|@nanostores|@radix-ui|@tanstack)[\\/].*\.[cm]?js$/ },
          ],
        },
      },
    },
  },
})