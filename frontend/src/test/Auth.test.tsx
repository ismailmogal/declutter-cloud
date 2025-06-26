import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';

describe('Authentication Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('shows login options when not authenticated', () => {
        render(<App />);
        
        expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('handles successful Microsoft login', async () => {
        // Mock successful auth response
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            connections: []
        };

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/auth/me') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        // Set token as if returned from OAuth
        localStorage.setItem('access_token', 'test_token');

        render(<App />);

        // Wait for user info to load
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });
    });

    it('handles failed authentication', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/auth/me') {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ detail: 'Invalid token' })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        // Set invalid token
        localStorage.setItem('access_token', 'invalid_token');

        render(<App />);

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
        });

        // Token should be removed
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('handles logout', async () => {
        // Mock authenticated user
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            connections: []
        };

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/auth/me') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        localStorage.setItem('access_token', 'test_token');

        render(<App />);

        // Wait for user info to load
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        // Click logout
        fireEvent.click(screen.getByText('Logout'));

        // Should show login options
        expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

        // Token should be removed
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('preserves authentication across page reloads', async () => {
        // Mock authenticated user
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            connections: []
        };

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/auth/me') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        // Set token before mount
        localStorage.setItem('access_token', 'test_token');

        // Initial render
        const { unmount } = render(<App />);

        // Wait for user info to load
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        // Unmount and remount to simulate page reload
        unmount();
        render(<App />);

        // User should still be logged in
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });
    });
}); 