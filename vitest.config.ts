import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    isolate: true,
    threads: false,
  },
});