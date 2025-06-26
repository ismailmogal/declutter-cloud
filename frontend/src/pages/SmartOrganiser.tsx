import { useState } from 'react';
import { Button, Box, Typography, CircularProgress, Alert } from '@mui/material';

const SmartOrganiser = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOrganise = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/onedrive/smart_organise', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategy: 'by_file_type' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to organise files.');
      }

      setResult(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Smart Organiser</Typography>
      <Typography paragraph>
        Automatically organise your files into folders based on their type (e.g., Documents, Images, Videos).
      </Typography>
      <Button variant="contained" onClick={handleOrganise} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Organise My Files'}
      </Button>
      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Organisation complete! Moved: {result.moved}, Errors: {result.errors}.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default SmartOrganiser; 