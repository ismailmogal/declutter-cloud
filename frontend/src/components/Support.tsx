import React from 'react';
import { Box, Typography, Paper, Link } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

interface SupportProps {
  onHelpClick?: () => void;
}

const Support: React.FC<SupportProps> = ({ onHelpClick }) => (
  <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SupportAgentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight={700}>Support</Typography>
      </Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Need help with Declutter Cloud? We're here for you!
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        • Check the <Link href="#" onClick={e => { e.preventDefault(); onHelpClick && onHelpClick(); }}>Help</Link> page for guides and tips.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        • For technical support, bug reports, or feature requests, email us at <Link href="mailto:support@decluttercloud.com">support@decluttercloud.com</Link>.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        • For urgent issues, contact our live chat (coming soon!).
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Thank you for using Declutter Cloud!
      </Typography>
    </Paper>
  </Box>
);

export default Support; 