import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import Header from '../components/Header';

const securityPoints = [
  'OAuth only: We never see your passwords. You connect your cloud accounts using secure, industry-standard OAuth.',
  'Read-only by default: We only request the minimum permissions needed to analyze your files. We never modify or delete anything without your explicit consent.',
  'No file storage: Your files are never stored on our servers. All analysis is done in-memory and results are shown only to you.',
  'End-to-end encryption: All data is encrypted in transit using HTTPS.',
  'Full user control: You can disconnect your cloud accounts and delete your data at any time from your settings.',
  'Transparency: We are open about our practices and roadmap. See our full Security & Trust Policy below.',
  'Audit logs: All sensitive actions are logged for security and transparency.',
  'Compliance: We aim to meet or exceed industry standards for privacy and security.'
];

const SecurityPage: React.FC = () => (
  <>
    <Header user={null} onLogout={() => {}} onSettingsClick={() => {}} />
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 6 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
          Security & Trust Policy
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Declutter Cloud is built with your privacy and security in mind. Here's how we protect you:
        </Typography>
        <List>
          {securityPoints.map((point, idx) => (
            <ListItem key={idx}>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText primary={point} />
            </ListItem>
          ))}
        </List>
        <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
          For more details, see our full policy and roadmap in the open source repository or contact us at support@decluttercloud.com.
        </Typography>
      </Paper>
    </Box>
  </>
);

export default SecurityPage; 