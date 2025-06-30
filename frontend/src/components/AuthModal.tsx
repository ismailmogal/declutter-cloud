import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { Visibility, VisibilityOff, Google, Microsoft } from '@mui/icons-material';
import { getSessionId } from '../utils/sessionId';
import apiClient from '../api/api';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data?: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const response = await apiClient.post('/auth/token', { username: email, password });
        
        const data = response.data;
        if (response.status !== 200) {
          throw new Error(data.detail || 'Failed to login');
        }
        
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          onSuccess();
        }

      } else { // Registration
        const response = await apiClient.post('/auth/register', { email, password, name });
        if (response.status !== 200) {
          throw new Error(response.data.detail || 'Failed to register');
        }
        // After successful registration, switch to login view with a success message
        setRegistrationSuccess(true);
        setMode('login');
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
    setLoading(true);
    setError('');
    
    try {
      const sessionId = await getSessionId();
      window.location.href = `/auth/${provider}/login?session_id=${sessionId}`;
    } catch (err: any) {
      setError('Failed to initiate social login');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setShowPassword(false);
    setRegistrationSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </DialogTitle>
      
      <DialogContent>
        {registrationSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            User has been registered and can now log in.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
          )}
          
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff data-testid="VisibilityOffIcon" /> : <Visibility data-testid="VisibilityIcon" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
            data-testid="auth-submit"
          >
            {loading ? <CircularProgress size={24} /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Google />}
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            fullWidth
          >
            Continue with Google
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Microsoft />}
            onClick={() => handleSocialLogin('microsoft')}
            disabled={loading}
            fullWidth
          >
            Continue with Microsoft
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Typography variant="body2">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <Button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              resetForm();
            }}
            sx={{ textTransform: 'none' }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </Button>
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default AuthModal; 