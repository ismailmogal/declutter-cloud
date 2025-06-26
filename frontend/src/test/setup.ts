import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Clean up after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

// Mock IntersectionObserver
class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

global.IntersectionObserver = IntersectionObserverMock;

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        hash: '',
        host: 'localhost:3000',
        hostname: 'localhost',
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        port: '3000',
        protocol: 'http:',
        search: '',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
    },
    writable: true,
}); 