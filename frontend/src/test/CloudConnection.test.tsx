import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';

describe('Cloud Connection Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('shows OneDrive not connected message when no connection exists', () => {
        // Mock the API response for no connections
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/cloud/connections') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([])
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        render(<App />);
        
        expect(screen.getByText('OneDrive Not Connected')).toBeInTheDocument();
        expect(screen.getByText('Please connect your OneDrive account to view files and suggestions.')).toBeInTheDocument();
    });

    it('shows files when OneDrive is connected', async () => {
        // Mock the connections API
        const mockConnections = [{
            id: 1,
            provider: 'onedrive',
            provider_user_email: 'test@example.com',
            is_active: true
        }];

        // Mock the files API
        const mockFiles = {
            files: [
                {
                    id: '123',
                    name: 'test.txt',
                    size: 1024,
                    last_modified: '2025-06-24T09:00:00Z',
                    folder: false
                },
                {
                    id: '456',
                    name: 'Documents',
                    size: 0,
                    last_modified: '2025-06-24T09:00:00Z',
                    folder: true,
                    childCount: 5
                }
            ]
        };

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/cloud/connections') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockConnections)
                });
            }
            if (url === '/api/onedrive/files') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockFiles)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        render(<App />);
        
        // Wait for the files to load
        await waitFor(() => {
            expect(screen.getByText('test.txt')).toBeInTheDocument();
            expect(screen.getByText('Documents')).toBeInTheDocument();
        });

        // Verify file details are displayed
        expect(screen.getByText('1.0 KB')).toBeInTheDocument();
        expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('handles folder navigation', async () => {
        // Mock the connections API
        const mockConnections = [{
            id: 1,
            provider: 'onedrive',
            provider_user_email: 'test@example.com',
            is_active: true
        }];

        // Mock different responses for root and subfolder
        const mockRootFiles = {
            files: [{
                id: 'folder1',
                name: 'My Documents',
                folder: true,
                childCount: 2
            }]
        };

        const mockSubfolderFiles = {
            files: [{
                id: 'file1',
                name: 'document.pdf',
                size: 2048,
                folder: false
            }]
        };

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/cloud/connections') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockConnections)
                });
            }
            if (url === '/api/onedrive/files') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockRootFiles)
                });
            }
            if (url.includes('folder_id=folder1')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockSubfolderFiles)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        render(<App />);

        // Wait for root folder content to load
        await waitFor(() => {
            expect(screen.getByText('My Documents')).toBeInTheDocument();
        });

        // Click on the folder
        fireEvent.click(screen.getByText('My Documents'));

        // Wait for subfolder content to load
        await waitFor(() => {
            expect(screen.getByText('document.pdf')).toBeInTheDocument();
        });

        // Test breadcrumb navigation
        expect(screen.getByText('My files')).toBeInTheDocument();
        expect(screen.getByText('My Documents')).toBeInTheDocument();

        // Click on "My files" to go back to root
        fireEvent.click(screen.getByText('My files'));

        // Wait for root folder content to reload
        await waitFor(() => {
            expect(screen.getByText('My Documents')).toBeInTheDocument();
        });
    });

    it('handles API errors gracefully', async () => {
        // Mock API error
        global.fetch = vi.fn().mockImplementation(() => 
            Promise.reject(new Error('Network error'))
        );

        render(<App />);

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Error')).toBeInTheDocument();
            expect(screen.getByText(/Network error/)).toBeInTheDocument();
        });
    });
}); 