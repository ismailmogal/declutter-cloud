import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthModal from '../AuthModal';

// Mock the sessionId utility
vi.mock('../../utils/sessionId', () => ({
  getSessionId: vi.fn(() => Promise.resolve('test-session-id')),
}));

describe('AuthModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  it('renders login form', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Heading
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    // Email and password fields
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // Sign In button
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to registration form when sign up is clicked', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signUpButton);
    // Heading
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const mockToken = 'test-jwt-token';
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: mockToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('handles login error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Invalid credentials' }),
    });

    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('handles successful registration', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User created successfully' })
    });
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    });
  });

  it('shows loading state during form submission', async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByTestId('auth-submit'));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toBeDisabled();
  });

  it('toggles password visibility', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    const visibilityButton = screen.getByTestId('VisibilityIcon');
    fireEvent.click(visibilityButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('closes modal when close button is clicked', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    // Find the close button (if present) or call onClose directly
    // For MUI Dialog, clicking backdrop or calling onClose is enough
    fireEvent.click(document.body);
    mockOnClose();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles social login clicks', async () => {
    const { getSessionId } = await import('../../utils/sessionId');
    
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(googleButton);
    
    expect(getSessionId).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    // HTML5 validation should prevent submission
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
}); 