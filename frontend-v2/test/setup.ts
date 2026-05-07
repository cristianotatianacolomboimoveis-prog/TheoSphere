import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup React Testing Library trees between tests.
afterEach(() => {
  cleanup();
});

// Stub a few globals that Next/Mapbox/DuckDB-WASM expect at import time.
// jsdom doesn't ship them, and missing them causes obscure stack traces.
if (typeof global.URL.createObjectURL === 'undefined') {
  Object.defineProperty(global.URL, 'createObjectURL', {
    value: () => 'blob:stub',
  });
}

// matchMedia: Tailwind / Headless UI / framer-motion poll this on mount.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList;
}
