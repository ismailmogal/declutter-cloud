import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Paper, Grid, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, ListItemIcon, IconButton } from '@mui/material';
import { Link, LinkOff } from '@mui/icons-material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Tooltip from '@mui/material/Tooltip';
import apiClient from '../api/api';
import { get as getIDB, set as setIDB } from 'idb-keyval';
import { useLocation } from 'react-router-dom';
import { storeToken } from '../utils/idbCache';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

interface CloudConnection {
  id: number;
  provider: string;
  provider_user_email?: string;
  is_active: boolean;
  email?: string;
  can_write?: boolean;
}

interface SettingsPageProps {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const GOOGLE_PHOTOS_AUTH_URL = 'http://localhost:8000/auth/googlephotos/login';

// Utility to clear token from both localStorage and IDB
async function clearToken() {
  localStorage.removeItem('token');
  if (window.indexedDB) {
    const { del } = await import('idb-keyval');
    await del('token');
  }
}

const SettingsPage: React.FC<SettingsPageProps> = ({ themeMode, setThemeMode }) => {
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Cloud Connections State
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState('');
  
  // Preferences State
  const [theme, setTheme] = useState(themeMode);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  
  const [user, setUser] = useState<any>(null);

  // Find Google Photos connection
  const googlePhotosConnection = connections.find(conn => conn.provider === 'googlephotos');

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const cloud = params.get('cloud');
  const status = params.get('status');

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeProvider, setRevokeProvider] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoadingConnections(true);
      setPreferencesLoading(true);
      try {
        const userRes = await apiClient.get('/api/user/me');
        setUser(userRes.data);
        setTheme(userRes.data.preferences?.theme || themeMode);

        const connectionsRes = await apiClient.get('/api/cloud/connections');
        setConnections(connectionsRes.data);

      } catch (error) {
        setConnectionsError('Failed to load user data.');
        setPreferencesError('Failed to load user data.');
      } finally {
        setLoadingConnections(false);
        setPreferencesLoading(false);
      }
    };
    fetchUserData();
  }, [themeMode]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await apiClient.put('/api/user/change-password', { current_password: currentPassword, new_password: newPassword });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      setPasswordError(error.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleThemeChange = async (event: any) => {
    const newTheme = event.target.value;
    setTheme(newTheme);
    setPreferencesLoading(true);
    try {
        await apiClient.put('/api/user/preferences', { theme: newTheme });
        setThemeMode(newTheme);
    } catch (error) {
        setPreferencesError("Failed to save theme preference");
    } finally {
        setPreferencesLoading(false);
    }
  };
  
  const handleConnect = async (provider: string) => {
    const token = localStorage.getItem('token');
    window.location.href = `/api/cloud/connect/${provider}?token=${token}`;
  };

  const handleDisconnect = async (connectionId: number) => {
    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) throw new Error('Connection not found');
      await apiClient.post('/api/cloud/disconnect', { provider: connection.provider });
      setConnections(connections.filter(c => c.id !== connectionId));
    } catch (error) {
      setConnectionsError('Failed to disconnect account.');
    }
  };
  
  const supportedProviders = [
    'onedrive',
    'googledrive',
    'dropbox',
    'icloud',
  ];

  const handleConnectGooglePhotos = async () => {
    try {
      const res = await apiClient.get('/auth/googlephotos/login');
      if (!res.data || !res.data.oauth_url) throw new Error('Failed to get Google Photos OAuth URL');
      window.location.href = res.data.oauth_url;
      if (res.data.token) storeToken(res.data.token);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        alert('Your Google Photos connection has expired or been revoked. Please reconnect.');
      } else {
        alert('Could not start Google Photos connection. Please log in and try again.');
      }
    }
  };

  const disconnectGooglePhotos = async () => {
    try {
      await apiClient.post('/api/cloud/disconnect/googlephotos');
      setConnections(connections.filter(c => c.provider !== 'googlephotos'));
      await clearToken();
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        alert('Your Google Photos connection has already expired or been revoked. Please reconnect.');
        setConnections(connections.filter(c => c.provider !== 'googlephotos'));
        await clearToken();
      } else {
        alert('Failed to disconnect Google Photos.');
      }
    }
  };

  const handleElevatePermissions = async (provider: string) => {
    const token = localStorage.getItem('token');
    window.location.href = `/api/cloud/connect/${provider}?token=${token}&elevate=true`;
  };

  const handleRevokePermissions = (provider: string) => {
    setRevokeProvider(provider);
    setRevokeDialogOpen(true);
  };

  const confirmRevokePermissions = async () => {
    if (!revokeProvider) return;
    // Disconnect the account first
    const connection = connections.find(c => c.provider === revokeProvider && c.is_active);
    if (connection) {
      await handleDisconnect(connection.id);
    }
    // Redirect to OAuth with read-only scopes
    const token = localStorage.getItem('token');
    window.location.href = `/api/cloud/connect/${revokeProvider}?token=${token}&elevate=false`;
    setRevokeDialogOpen(false);
    setRevokeProvider(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Grid container spacing={4}>
        {/* Change Password Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
            <form onSubmit={handlePasswordChange}>
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                margin="normal"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <TextField
                label="New Password"
                type="password"
                fullWidth
                margin="normal"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              {passwordError && <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert>}
              {passwordSuccess && <Alert severity="success" sx={{ mt: 2 }}>{passwordSuccess}</Alert>}
              <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={passwordLoading}>
                {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </form>
          </Paper>
        </Grid>
        
        {/* User Preferences Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Preferences</Typography>
            <FormControl fullWidth disabled={preferencesLoading}>
              <InputLabel>Theme</InputLabel>
              <Select value={theme} label="Theme" onChange={handleThemeChange}>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
            {preferencesError && <Alert severity="error" sx={{ mt: 2 }}>{preferencesError}</Alert>}
          </Paper>

          {/* Cloud Connections Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Cloud Connections</Typography>
            {loadingConnections ? <CircularProgress /> : (
              <>
                {status === 'success' && cloud && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {cloud.charAt(0).toUpperCase() + cloud.slice(1)} connected successfully!
                  </Alert>
                )}
                <List>
                  {supportedProviders.map(provider => {
                    const connection = connections.find(c => c.provider === provider && c.is_active);
                    const isReadOnly = connection && !connection.can_write;
                    return (
                      <ListItem key={provider} secondaryAction={
                        connection ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isReadOnly ? (
                              <Tooltip title="Grant Write/Delete Access">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleElevatePermissions(provider)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Revoke Write/Delete Access (downgrade to read-only)">
                                <IconButton
                                  color="warning"
                                  size="small"
                                  onClick={() => handleRevokePermissions(provider)}
                                >
                                  <RemoveCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Button variant="outlined" color="error" onClick={() => handleDisconnect(connection.id)} size="small">Disconnect</Button>
                          </Box>
                        ) : (
                          <Button variant="contained" onClick={() => handleConnect(provider)} size="small">Connect</Button>
                        )
                      }>
                        <ListItemIcon>{connection ? <Link /> : <LinkOff />}</ListItemIcon>
                        <ListItemText
                          primary={provider.charAt(0).toUpperCase() + provider.slice(1)}
                          secondary={connection
                            ? (isReadOnly ? 'Read-only access' : 'Full access (write/delete enabled)')
                            : 'Not connected'}
                        />
                      </ListItem>
                    );
                  })}
                  <ListItem>
                    <ListItemIcon>
                      <PhotoLibraryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Google Photos"
                      secondary={googlePhotosConnection?.email || "Not connected"}
                    />
                    {googlePhotosConnection
                      ? <Button variant="outlined" color="error" onClick={disconnectGooglePhotos}>DISCONNECT</Button>
                      : <Button variant="contained" color="primary" onClick={handleConnectGooglePhotos}>CONNECT</Button>
                    }
                  </ListItem>
                </List>
              </>
            )}
            {connectionsError && <Alert severity="error" sx={{ mt: 2 }}>{connectionsError}</Alert>}
          </Paper>
        </Grid>
      </Grid>
      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Downgrade Access</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            To remove write/delete access, we'll disconnect your account and ask you to reconnect with read-only permissions.<br/>
            For extra security, you can also revoke access from your provider's security page:
          </Typography>
          <ul style={{ marginTop: 0 }}>
            <li>
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>
            </li>
            <li>
              <a href="https://myaccount.microsoft.com/consents" target="_blank" rel="noopener noreferrer">Microsoft Account Permissions</a>
            </li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            You will be prompted to reconnect with reduced access after disconnecting.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmRevokePermissions} color="warning" variant="contained">Disconnect & Reconnect</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage; 