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
        <ListItem><ListItemText primary="• Cross-Cloud Duplicates: Find and merge duplicate files across all your connected cloud providers in one place." /></ListItem>
      </List>
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>How to Use Cross-Cloud Duplicates</Typography>
      <List sx={{ mb: 2 }}>
        <ListItem><ListItemText primary="1. Connect at least two cloud providers (e.g., Google Drive and OneDrive) from the Settings page." /></ListItem>
        <Box sx={{ pl: 4, mb: 2 }}>
          <img src="/help/connect-clouds.png" alt="Connect cloud providers screenshot" style={{ maxWidth: 400, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
          <Typography variant="caption" display="block">Screenshot: Connecting cloud providers in Settings</Typography>
        </Box>
        <ListItem><ListItemText primary="2. Click 'Cross-Cloud Duplicates' in the sidebar." /></ListItem>
        <Box sx={{ pl: 4, mb: 2 }}>
          <img src="/help/sidebar-crosscloud.png" alt="Sidebar with Cross-Cloud Duplicates highlighted" style={{ maxWidth: 220, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
          <Typography variant="caption" display="block">Screenshot: Sidebar navigation to Cross-Cloud Duplicates</Typography>
        </Box>
        <ListItem><ListItemText primary="3. Wait for the scan to complete. Duplicate groups will be shown, even if files are on different clouds." /></ListItem>
        <Box sx={{ pl: 4, mb: 2 }}>
          <img src="/help/crosscloud-scan.png" alt="Cross-Cloud Duplicates scan results" style={{ maxWidth: 400, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
          <Typography variant="caption" display="block">Screenshot: Duplicate groups found across clouds</Typography>
        </Box>
        <ListItem><ListItemText primary="4. Review the duplicates and select which files to keep or merge. You can use merge strategies like 'Keep Largest' or 'Keep Most Recent'." /></ListItem>
        <Box sx={{ pl: 4, mb: 2 }}>
          <img src="/help/merge-strategy.png" alt="Merge strategy selection screenshot" style={{ maxWidth: 350, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
          <Typography variant="caption" display="block">Screenshot: Choosing a merge strategy</Typography>
        </Box>
        <ListItem><ListItemText primary="5. Click 'Merge' to remove duplicates and keep only your chosen files across all clouds." /></ListItem>
        <Box sx={{ pl: 4, mb: 2 }}>
          <img src="/help/merge-action.png" alt="Merge action screenshot" style={{ maxWidth: 350, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
          <Typography variant="caption" display="block">Screenshot: Merging duplicates across clouds</Typography>
        </Box>
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