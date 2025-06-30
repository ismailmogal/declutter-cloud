import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsModal from '../SettingsModal';
import apiClient from '../../api/api';

// Mock the apiClient
vi.mock('../../api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedApiClientPost = apiClient.post as ReturnType<typeof vi.fn>;

describe('SettingsModal', () => {
  const handleClose = vi.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockedApiClientPost.mockClear();
    handleClose.mockClear();
  });

  it('renders correctly when open', () => {
    render(<SettingsModal isOpen={true} onClose={handleClose} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('allows typing in password fields', () => {
    render(<SettingsModal isOpen={true} onClose={handleClose} />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    expect(currentPasswordInput).toHaveValue('oldpass');
    expect(newPasswordInput).toHaveValue('newpass123');
    expect(confirmPasswordInput).toHaveValue('newpass123');
  });

  it('shows an error if new passwords do not match', async () => {
    render(<SettingsModal isOpen={true} onClose={handleClose} />);
    
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'mismatch' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText("New passwords don't match.")).toBeVisible();
    expect(mockedApiClientPost).not.toHaveBeenCalled();
  });

  it('shows an error if new password is too short', async () => {
    render(<SettingsModal isOpen={true} onClose={handleClose} />);
    
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    
    expect(await screen.findByText('New password must be at least 8 characters long.')).toBeVisible();
    expect(mockedApiClientPost).not.toHaveBeenCalled();
  });

  it('calls the changePassword API on successful submission', async () => {
    mockedApiClientPost.mockResolvedValue({ data: { message: 'Success!' } });
    render(<SettingsModal isOpen={true} onClose={handleClose} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'current' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newSecurePassword' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newSecurePassword' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(mockedApiClientPost).toHaveBeenCalledWith('/api/user/change-password', {
        current_password: 'current',
        new_password: 'newSecurePassword',
      });
    });
    
    expect(await screen.findByText('Success!')).toBeVisible();
  });

  it('shows an error message if the API call fails', async () => {
    mockedApiClientPost.mockRejectedValue({
      response: { data: { detail: 'Incorrect current password' } }
    });
    render(<SettingsModal isOpen={true} onClose={handleClose} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrongOldPass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newSecurePassword' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newSecurePassword' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Incorrect current password')).toBeVisible();
  });
}); 