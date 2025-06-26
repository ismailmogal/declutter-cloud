import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import AuthModal from '../components/AuthModal';

describe('AuthModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location mock
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: '' },
    });
  });

  it('renders login form by default', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument();
  });

  it('switches to registration form', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Sign up'));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
  });

  it('handles email/password login successfully', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // For /auth/token
        ok: true,
        json: () => Promise.resolve({ access_token: 'fake_token' }),
      })
      .mockResolvedValueOnce({ // For /auth/me
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com' }),
      });

    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByTestId('auth-submit'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  it('handles social login button click', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.click(screen.getByText('Continue with Google'));
    expect(window.location.href).toContain('/auth/google/login');
  });

  it('shows password when visibility icon is clicked', () => {
    render(<AuthModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const passwordInput = screen.getByLabelText('Password');
    const visibilityIcon = screen.getByTestId('VisibilityIcon');

    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(visibilityIcon);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    const visibilityOffIcon = screen.getByTestId('VisibilityOffIcon');
    fireEvent.click(visibilityOffIcon);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
}); 