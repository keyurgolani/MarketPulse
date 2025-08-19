import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server/**', // Exclude backend tests - they use Jest
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
  resolve: {
    alias: [
      // Server aliases (for server tests)
      {
        find: /^@\/config/,
        replacement: fileURLToPath(
          new URL('./server/src/config', import.meta.url)
        ),
      },
      {
        find: /^@\/controllers/,
        replacement: fileURLToPath(
          new URL('./server/src/controllers', import.meta.url)
        ),
      },
      {
        find: /^@\/middleware/,
        replacement: fileURLToPath(
          new URL('./server/src/middleware', import.meta.url)
        ),
      },
      {
        find: /^@\/models/,
        replacement: fileURLToPath(
          new URL('./server/src/models', import.meta.url)
        ),
      },
      {
        find: /^@\/routes/,
        replacement: fileURLToPath(
          new URL('./server/src/routes', import.meta.url)
        ),
      },
      {
        find: /^@\/services/,
        replacement: fileURLToPath(
          new URL('./server/src/services', import.meta.url)
        ),
      },
      {
        find: /^@\/utils/,
        replacement: fileURLToPath(
          new URL('./server/src/utils', import.meta.url)
        ),
      },
      // Frontend aliases (fallback for non-server paths)
      {
        find: /^@\/(?!.*server)/,
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      {
        find: '@/components',
        replacement: fileURLToPath(
          new URL('./src/components', import.meta.url)
        ),
      },
      {
        find: '@/hooks',
        replacement: fileURLToPath(new URL('./src/hooks', import.meta.url)),
      },
      {
        find: '@/stores',
        replacement: fileURLToPath(new URL('./src/stores', import.meta.url)),
      },
      {
        find: '@/types',
        replacement: fileURLToPath(new URL('./src/types', import.meta.url)),
      },
    ],
  },
});
