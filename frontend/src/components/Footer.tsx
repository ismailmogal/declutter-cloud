import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer: React.FC<{ onSupportClick?: () => void }> = ({ onSupportClick }) => (
  <Box sx={{ mt: 4, py: 2, textAlign: 'center', color: 'text.secondary', borderTop: '1px solid #eee' }}>
    <Typography variant="body2">
      © {new Date().getFullYear()} Declutter Cloud &mdash;{' '}
      <Link href="#" onClick={e => { e.preventDefault(); onSupportClick && onSupportClick(); }}>
        Support
      </Link>
    </Typography>
  </Box>
);

export default Footer; 