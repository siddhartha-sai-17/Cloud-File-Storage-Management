import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock import.meta.env for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: false,
    PROD: false,
    VITE_API_URL: 'http://localhost:8080',
  },
  writable: true,
});

// Mock window.matchMedia for reduced-motion checks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB for offline tests
const IDBFactory = vi.fn(() => ({
  open: vi.fn(),
}));
Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory() });

// Suppress console errors in tests (optional — comment out for debugging)
// vi.spyOn(console, 'error').mockImplementation(() => {});
