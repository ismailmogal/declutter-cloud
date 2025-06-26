import React from 'react';
import { Button, Stack } from '@mui/material';
import { getSessionId } from '../utils/sessionId';

const BACKEND_URL = 'http://localhost:8000';

const LoginButton: React.FC = () => {
  const handleLogin = async (provider: 'google' | 'microsoft') => {
    const sessionId = await getSessionId();
    console.log('[DEBUG] Using sessionId for login:', sessionId);
    window.location.href = `${BACKEND_URL}/auth/${provider}/login?session_id=${sessionId}`;
  };

  const handleConnectOneDrive = async () => {
    const sessionId = await getSessionId();
    console.log('[DEBUG] Using sessionId for OneDrive:', sessionId);
    window.location.href = `${BACKEND_URL}/auth/onedrive/login?session_id=${sessionId}`;
  };

  return (
    <Stack spacing={2} direction="row">
      <Button variant="contained" color="primary" onClick={() => handleLogin('google')}>
        Login with Google
      </Button>
      <Button variant="contained" color="secondary" onClick={() => handleLogin('microsoft')}>
        Login with Microsoft
      </Button>
      <Button variant="contained" color="info" onClick={handleConnectOneDrive}>
        Connect OneDrive
      </Button>
    </Stack>
  );
};

export default LoginButton; 