import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Paper, Grid, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, ListItemIcon, IconButton } from '@mui/material';
import { Link, LinkOff } from '@mui/icons-material';
import apiClient from '../api/api';

interface CloudConnection {
  id: number;
  provider: string;
  email: string;
  is_active: boolean;
}

interface SettingsPageProps {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
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
    // Logic to initiate OAuth flow
    window.location.href = `/api/cloud/${provider}/login`;
  };

  const handleDisconnect = async (connectionId: number) => {
    try {
        await apiClient.post(`/api/cloud/disconnect/${connectionId}`);
        setConnections(connections.filter(c => c.id !== connectionId));
    } catch (error) {
        setConnectionsError('Failed to disconnect account.');
    }
  };
  
  const supportedProviders = ['onedrive'];

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
              <List>
                {supportedProviders.map(provider => {
                  const connection = connections.find(c => c.provider === provider && c.is_active);
                  return (
                    <ListItem key={provider} secondaryAction={
                      connection ? (
                        <Button variant="outlined" color="error" onClick={() => handleDisconnect(connection.id)}>Disconnect</Button>
                      ) : (
                        <Button variant="contained" onClick={() => handleConnect(provider)}>Connect</Button>
                      )
                    }>
                      <ListItemIcon>{connection ? <Link /> : <LinkOff />}</ListItemIcon>
                      <ListItemText primary={provider.charAt(0).toUpperCase() + provider.slice(1)} secondary={connection ? connection.email : 'Not connected'} />
                    </ListItem>
                  );
                })}
              </List>
            )}
            {connectionsError && <Alert severity="error" sx={{ mt: 2 }}>{connectionsError}</Alert>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage; 