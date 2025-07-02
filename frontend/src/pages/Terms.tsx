import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';

const TermsPage: React.FC = () => (
  <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
    <Paper sx={{ p: 4 }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <GavelIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4" component="h1">Declutter Cloud Terms of Service</Typography>
      </Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Welcome to Declutter Cloud! By using our service, you agree to the following terms. Please read them carefully.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>1. Acceptance of Terms</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        By accessing or using Declutter Cloud, you agree to be bound by these Terms of Service and our <a href="/privacy" style={{ color: '#1976d2' }}>Privacy Policy</a>.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>2. Permitted Use</Typography>
      <List>
        <ListItem>
          <ListItemText primary="You may use Declutter Cloud only for lawful purposes and in accordance with these terms." />
        </ListItem>
        <ListItem>
          <ListItemText primary="You are responsible for maintaining the security of your account and cloud connections." />
        </ListItem>
        <ListItem>
          <ListItemText primary="You may not use Declutter Cloud to infringe on the rights of others or to violate any laws." />
        </ListItem>
      </List>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>3. Privacy</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        We respect your privacy. Please review our <a href="/privacy" style={{ color: '#1976d2' }}>Privacy Policy</a> to understand how we handle your data.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>4. Limitation of Liability</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Declutter Cloud is provided "as is" without warranties of any kind. We are not liable for any damages or losses resulting from your use of the service.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>5. Changes to Terms</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        We may update these Terms of Service from time to time. Continued use of Declutter Cloud means you accept the revised terms.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>6. Contact</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        If you have any questions about these terms, please contact us at <a href="mailto:support@decluttercloud.com" style={{ color: '#1976d2' }}>support@decluttercloud.com</a>.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        Last updated: {new Date().toLocaleDateString()}
      </Typography>
    </Paper>
  </Box>
);

export default TermsPage; 