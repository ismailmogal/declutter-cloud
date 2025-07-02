import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

const PrivacyPage: React.FC = () => (
  <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
    <Paper sx={{ p: 4 }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SecurityIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4" component="h1">Declutter Cloud Privacy Policy</Typography>
      </Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Declutter Cloud is a multi-cloud file management platform that helps you organize, deduplicate, and manage your files across Google Drive, OneDrive, and other cloud providers. Your privacy and security are our top priorities.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>What information do we collect?</Typography>
      <List>
        <ListItem>
          <ListItemIcon><SecurityIcon color="action" /></ListItemIcon>
          <ListItemText primary="We only access your files and metadata (such as file names, sizes, and types) as needed to provide our services. We do not store your files on our servers." />
        </ListItem>
        <ListItem>
          <ListItemIcon><SecurityIcon color="action" /></ListItemIcon>
          <ListItemText primary="OAuth tokens are stored securely and are only used to access your cloud accounts with your explicit permission." />
        </ListItem>
        <ListItem>
          <ListItemIcon><SecurityIcon color="action" /></ListItemIcon>
          <ListItemText primary="We do not share your data with third parties. Your information is used solely to provide Declutter Cloud features." />
        </ListItem>
      </List>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>How do we use your data?</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        We use your data only to:
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="Display and organize your files from connected cloud providers." />
        </ListItem>
        <ListItem>
          <ListItemText primary="Detect and help you remove duplicate files." />
        </ListItem>
        <ListItem>
          <ListItemText primary="Provide analytics and recommendations to optimize your storage." />
        </ListItem>
      </List>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Your Control</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        You can disconnect your cloud accounts or revoke Declutter Cloud's access at any time from your account settings or your cloud provider's security page.
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Security</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        We use industry-standard encryption and best practices to protect your data. For more details, see our <a href="/security" style={{ color: '#1976d2' }}>Security page</a>.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        Last updated: {new Date().toLocaleDateString()}
      </Typography>
    </Paper>
  </Box>
);

export default PrivacyPage; 