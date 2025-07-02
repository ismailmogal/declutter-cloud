import React, { useEffect, useState } from 'react';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import apiClient from '../api/api';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/features/${feature}/access`);
        setHasAccess(res.data?.access ?? false);
        setUsage(res.data?.usage ?? null);
        setLimit(res.data?.limit ?? null);
      } catch (err) {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [feature]);

  if (loading) return <CircularProgress />;
  if (!hasAccess) {
    return fallback || (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          {reason === 'usage_limit_exceeded'
            ? 'You have reached your usage limit for this feature.'
            : 'This feature is not available on your current plan.'}
        </Typography>
        <Button variant="contained" color="primary" href="/pricing" sx={{ mt: 2 }}>
          Upgrade Plan
        </Button>
      </Box>
    );
  }
  return <>{children}</>;
};

export default FeatureGate; 