import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Box, CircularProgress, Alert, Toolbar, Modal,
  ThemeProvider, createTheme, CssBaseline 
} from '@mui/material';
import { AuthProvider, useAuth } from './auth/AuthProvider';

import HomePage from './pages/HomePage';
import MyFiles from './pages/MyFiles';
import Compare from './pages/Compare';
import SmartOrganiser from './pages/SmartOrganiser';
import SettingsPage from './pages/Settings';
import Help from './components/Help';
import Footer from './components/Footer';
import Support from './components/Support';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import apiClient from './api/api';
import { storeToken } from './utils/idbCache';
import CrossCloudDuplicates from './components/CrossCloudDuplicates';
import SecurityPage from './pages/Security';
import PrivacyPage from './pages/Privacy';
import TermsPage from './pages/Terms';

const App: React.FC = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    if (user && user.preferences?.theme) {
      setThemeMode(user.preferences.theme);
    }
  }, [user]);

  const theme = React.useMemo(() =>
    createTheme({
      palette: { mode: themeMode },
    }),
    [themeMode]
  );

  if (isAuthenticated === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {isAuthenticated ? (
            <Route path="/*" element={
              <LoggedInApp onLogout={logout} themeMode={themeMode} setThemeMode={setThemeMode} />
            } />
          ) : (
            <Route path="/*" element={<HomePage onLoginSuccess={() => { window.location.reload(); }} />} />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

const LoggedInApp = ({ onLogout, themeMode, setThemeMode }: { onLogout: () => void, themeMode: 'light' | 'dark', setThemeMode: (mode: 'light' | 'dark') => void }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/user/me');
      setUser(response.data);
      if (response.data.preferences?.theme) {
        setThemeMode(response.data.preferences.theme);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred fetching user profile.');
      if (err.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Box>Could not load user profile. Please try logging in again.</Box>;

  const handleHelpClickFromModal = () => {
    setIsSupportModalOpen(false);
    navigate('/help');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <Header user={user} onLogout={onLogout} onSettingsClick={() => {}} />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
          <Toolbar />
          <Routes>
            <Route path="/files" element={<MyFiles />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/smart-organiser" element={<SmartOrganiser />} />
            <Route path="/settings" element={<SettingsPage themeMode={themeMode} setThemeMode={setThemeMode} />} />
            <Route path="/help" element={<Help />} />
            <Route path="/cross-cloud-duplicates" element={<CrossCloudDuplicates />} />
            <Route path="*" element={<Navigate to="/files" />} />
          </Routes>
        </Box>
      </Box>
      <Footer onSupportClick={() => setIsSupportModalOpen(true)} />
      <Modal open={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxWidth: 600, width: '90%' }}>
          <Support onHelpClick={handleHelpClickFromModal} />
        </Box>
      </Modal>
    </Box>
  );
};

export default App; 