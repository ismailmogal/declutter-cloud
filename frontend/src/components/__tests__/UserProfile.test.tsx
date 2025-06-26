import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfile from '../UserProfile';

describe('UserProfile', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  const mockOnLogout = vi.fn();
  const mockOnOpenSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user information correctly', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('google')).toBeInTheDocument();
  });

  it('displays user initials when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar_url: undefined };
    
    render(
      <UserProfile 
        user={userWithoutAvatar} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('displays email when no name is provided', () => {
    const userWithoutName = { ...mockUser, name: undefined };
    
    render(
      <UserProfile 
        user={userWithoutName} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows provider chip when provider is available', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    expect(screen.getByText('google')).toBeInTheDocument();
  });

  it('does not show provider chip when no provider', () => {
    const userWithoutProvider = { ...mockUser, provider: undefined };
    
    render(
      <UserProfile 
        user={userWithoutProvider} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    expect(screen.queryByText('google')).not.toBeInTheDocument();
  });

  it('opens menu when avatar is clicked', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls onOpenSettings when settings is clicked', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(mockOnOpenSettings).toHaveBeenCalled();
  });

  it('calls onLogout and removes token when logout is clicked', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockOnLogout).toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('closes menu when toggling avatar button', async () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Toggle again to close
    fireEvent.click(avatarButton);
    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  it('generates correct initials for multi-word names', () => {
    const userWithLongName = { ...mockUser, name: 'John Doe Smith', avatar_url: undefined };
    
    render(
      <UserProfile 
        user={userWithLongName} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    // Check for the initials in the avatar (should be JD, not JS)
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('generates initials from email when no name', () => {
    const userWithEmailOnly = { 
      ...mockUser, 
      name: undefined, 
      email: 'john.doe@example.com',
      avatar_url: undefined
    };
    
    render(
      <UserProfile 
        user={userWithEmailOnly} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    // Check for the initials in the avatar (should be J, not JD)
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('handles single word names correctly', () => {
    const userWithSingleName = { ...mockUser, name: 'John', avatar_url: undefined };
    
    render(
      <UserProfile 
        user={userWithSingleName} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    // Check for the initial in the avatar
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('displays avatar image when available', () => {
    render(
      <UserProfile 
        user={mockUser} 
        onLogout={mockOnLogout} 
        onOpenSettings={mockOnOpenSettings} 
      />
    );
    
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
}); 