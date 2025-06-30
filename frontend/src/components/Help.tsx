import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

const Help: React.FC = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CloudQueueIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight={700}>Declutter Cloud Help</Typography>
      </Box>
      <Typography variant="h6" gutterBottom>Getting Started</Typography>
      <List>
        <ListItem><ListItemText primary="1. Connect your cloud storage (OneDrive, Google Drive, etc.) from the settings/profile menu." /></ListItem>
        <ListItem><ListItemText primary="2. Use the left navigation to access My Files, Compare, Smart Organiser, and Help." /></ListItem>
        <ListItem><ListItemText primary="3. Browse, search, and manage your files securely in the cloud." /></ListItem>
      </List>
      <Typography variant="h6" gutterBottom>Main Features</Typography>
      <List>
        <ListItem><ListItemText primary="• My Files: Browse and manage all your cloud files and folders." /></ListItem>
        <ListItem><ListItemText primary="• Compare: Find and compare duplicate files across folders." /></ListItem>
        <ListItem><ListItemText primary="• Smart Organiser: Get analytics, cleanup recommendations, and auto-organise your files." /></ListItem>
        <ListItem><ListItemText primary="• Duplicate Images: Detect and remove duplicate photos with preview." /></ListItem>
        <ListItem><ListItemText primary="• Rules: Set up custom rules for file organisation and cleanup." /></ListItem>
      </List>
      <Typography variant="h6" gutterBottom>Tips</Typography>
      <List>
        <ListItem><ListItemText primary="• Use the sidebar icons for quick navigation." /></ListItem>
        <ListItem><ListItemText primary="• Click the Declutter Cloud logo to return home at any time." /></ListItem>
        <ListItem><ListItemText primary="• Use the Help page for guidance and troubleshooting." /></ListItem>
        <ListItem><ListItemText primary="• For best results, keep your cloud connections active and up to date." /></ListItem>
      </List>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Need more help? Contact support or check the documentation for advanced features.
      </Typography>
    </Paper>
  </Box>
);

export default Help; 