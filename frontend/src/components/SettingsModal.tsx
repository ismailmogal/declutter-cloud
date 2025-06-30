import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { CheckCircle, Error, Link, LinkOff, Refresh } from '@mui/icons-material';

interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  email?: string;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
  refreshUser: () => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, user, refreshUser }) => {
  const [providers, setProviders] = useState<CloudProvider[]>([
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: '☁️',
      description: 'Microsoft OneDrive cloud storage',
      connected: false
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: '📁',
      description: 'Google Drive cloud storage',
      connected: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.connections) {
      setProviders(prev => prev.map(provider => {
        const conn = user.connections.find((c: any) => c.provider === provider.id);
        return {
          ...provider,
          connected: !!conn,
          email: conn?.provider_user_email
        };
      }));
    }
  }, [user]);

  const handleConnect = async (providerId: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      const response = await fetch(`/auth/${providerId}/login?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        redirect: 'manual',
      });
      if (response.type === 'opaqueredirect' || response.status === 0) {
        window.location.href = response.url;
        return;
      }
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        } else {
          setError('Failed to get authorization URL');
          await refreshUser();
          onClose();
        }
      } else {
        setError('Failed to initiate connection');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const response = await fetch(`/api/cloud/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });
      if (response.ok) {
        await refreshUser();
        onClose();
      } else {
        setError('Failed to disconnect');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Cloud Storage Settings
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your cloud storage accounts to access and manage your files.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {providers.map((provider) => (
            <Card key={provider.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
                      {provider.icon}
                    </Typography>
                    <Box>
                      <Typography variant="h6">
                        {provider.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {provider.description}
                      </Typography>
                      {provider.email && (
                        <Typography variant="caption" color="text.secondary">
                          Connected as: {provider.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {provider.connected ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Connected"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Error />}
                        label="Not Connected"
                        color="default"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions>
                {provider.connected ? (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOff />}
                    onClick={() => handleDisconnect(user.connections.find((c: any) => c.provider === provider.id).id)}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Link />}
                    onClick={() => handleConnect(provider.id)}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Connect'}
                  </Button>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal; 