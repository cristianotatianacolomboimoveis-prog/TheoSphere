import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest config for the frontend.
 *
 *   - jsdom environment so React Testing Library works.
 *   - `@/` alias matches Next's tsconfig paths.
 *   - Inline `process.env.NEXT_PUBLIC_*` defaults so client modules don't
 *     blow up on import during unit tests.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
