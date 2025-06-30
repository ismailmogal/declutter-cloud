import React, { useState } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import AuthModal from '../components/AuthModal';
import Logo from '../components/Logo';

interface HomePageProps {
  onLoginSuccess: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <Paper elevation={2} sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
    <Box sx={{ color: 'primary.main', mb: 2, height: 48 }}>
      {icon}
    </Box>
    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {description}
    </Typography>
  </Paper>
);

const HomePage: React.FC<HomePageProps> = ({ onLoginSuccess }) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Logo size={32} />
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', ml: 1.5 }}>
                Declutter Cloud
              </Typography>
            </Box>
            <Button variant="contained" color="primary" onClick={() => setAuthModalOpen(true)}>
              Login / Sign Up
            </Button>
          </Box>

          {/* Hero Section */}
          <Box sx={{ textAlign: 'center', my: 10 }}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Reclaim Your Digital Space
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '700px', mx: 'auto', mb: 4 }}>
              Intelligently scan your cloud storage, find duplicates, and organize your files with powerful, automated rules.
            </Typography>
            <Button variant="contained" size="large" onClick={() => setAuthModalOpen(true)} sx={{ py: 1.5, px: 4 }}>
              Connect Your Cloud Storage
            </Button>
          </Box>

          {/* Features Section */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
            <Feature
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
              }
              title="Cross-Cloud Scanning"
              description="Connect Google Drive, OneDrive, and more. See all your files in one place."
            />
            <Feature
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25v8.25A2.25 2.25 0 0 1 18 20.25h-8.25A2.25 2.25 0 0 1 7.5 18v-1.5m8.25-8.25h-6M12 12.75h.008v.008H12v-.008Z" />
                </svg>
              }
              title="Duplicate Detection"
              description="Find duplicate and similar files instantly to free up valuable storage space."
            />
            <Feature
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              }
              title="Smart Organization"
              description="Create custom rules to automatically sort, tag, or delete files based on your criteria."
            />
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 10, color: 'text.secondary' }}>
            <Typography variant="body2">
              &copy; {new Date().getFullYear()} Declutter Cloud. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={onLoginSuccess} />
    </>
  );
};

export default HomePage; 