import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    // Tailwind runs through `@tailwindcss/vite`, so no PostCSS config is
    // wanted. Passing an inline config stops Vite searching parent
    // directories, where it would otherwise find an unrelated project's
    // postcss.config.mjs and fail the build.
    postcss: { plugins: [] },
  },
  build: {
    rollupOptions: {
      output: {
        // Three.js and Tone.js are both large and change far less often than
        // game code, so splitting them keeps the cacheable bulk separate from
        // the part that actually gets edited.
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          audio: ['tone'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
