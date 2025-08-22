import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/components': fileURLToPath(
        new URL('./src/components', import.meta.url)
      ),
      '@/hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@/services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@/stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@/types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': [
            'chart.js',
            'react-chartjs-2',
            'chartjs-adapter-date-fns',
          ],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],

          // App chunks
          services: [
            'src/services/apiClient.ts',
            'src/services/marketDataService.ts',
            'src/services/newsService.ts',
            'src/services/dashboardService.ts',
            'src/services/authService.ts',
          ],
          stores: [
            'src/stores/userStore.ts',
            'src/stores/dashboardStore.ts',
            'src/stores/themeStore.ts',
            'src/stores/apiStore.ts',
          ],
          'components-ui': [
            'src/components/ui/Button.tsx',
            'src/components/ui/Input.tsx',
            'src/components/ui/Modal.tsx',
            'src/components/ui/Loading.tsx',
            'src/components/ui/ErrorBoundary.tsx',
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: true,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'chart.js',
      'react-chartjs-2',
      'zustand',
    ],
  },
});
